import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { LiquidacionIVA } from './liquidacion-iva.entity';
import { Venta } from '../ventas/venta.entity';
import { Gasto } from '../gastos/gasto.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { OrdenProducto } from '../productos/orden-producto.entity';
import { NotaFiscal } from '../notas-fiscales/nota-fiscal.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';

const EXENTAS = ['Exento', 'Exonerado'];
const RATE: Record<string, number> = { T13: 0.13, T04: 0.04, T02: 0.02, T01: 0.01, T005: 0.005, Exento: 0, NoSujeto: 0 };

@Injectable()
export class IvaService {
  private readonly logger = new Logger(IvaService.name);
  constructor(
    @InjectRepository(LiquidacionIVA) private repo: Repository<LiquidacionIVA>,
    @InjectRepository(Venta) private ventasRepo: Repository<Venta>,
    @InjectRepository(Gasto) private gastosRepo: Repository<Gasto>,
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(OrdenProducto) private ordenesRepo: Repository<OrdenProducto>,
    @InjectRepository(NotaFiscal) private notasRepo: Repository<NotaFiscal>,
    private readonly contabilidad: ContabilidadService,
    private readonly notifs: NotificationsService,
  ) {}

  private hoyCR(): string { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }); }
  private periodoAnterior(): string {
    const d = new Date();
    d.setDate(1); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }
  private rangoMes(periodo: string): { desde: string; hasta: string } {
    const [y, m] = periodo.split('-').map(Number);
    const desde = `${periodo}-01`;
    const hasta = new Date(y, m, 0).toLocaleDateString('en-CA');
    return { desde, hasta };
  }

  // ── Consolidación (cálculo del período, sin persistir) ─────────────────────
  async consolidar(periodo: string, opciones?: { retenciones?: number }): Promise<Partial<LiquidacionIVA>> {
    const { desde, hasta } = this.rangoMes(periodo);

    // Ventas del mes
    const ventas = await this.ventasRepo.find({
      where: { fecha_venta: Between(new Date(`${desde}T00:00:00`), new Date(`${hasta}T23:59:59`)) as any },
    });
    const ventasPorTarifa: Record<string, { base: number; iva: number }> = {};
    let debito = 0, gravadasBase = 0, exentasBase = 0;
    for (const v of ventas) {
      const base = Number(v.monto_final) || 0;
      const iva = Number(v.iva_monto) || 0;
      const exenta = EXENTAS.includes(v.iva_condicion) || v.iva_tarifa === 'Exento';
      const key = exenta ? 'Exento' : v.iva_tarifa === 'NoSujeto' ? 'NoSujeto' : (v.iva_tarifa || 'T13');
      const b = ventasPorTarifa[key] ?? { base: 0, iva: 0 };
      b.base += base; b.iva += exenta ? 0 : iva;
      ventasPorTarifa[key] = b;
      if (exenta) exentasBase += base;
      else if (key !== 'NoSujeto') { gravadasBase += base; debito += iva; }
    }

    // Ventas de repuestos/taller (órdenes de producto) por tarifa de línea
    const ordenes = await this.ordenesRepo.find({
      where: { fecha_creacion: Between(new Date(`${desde}T00:00:00`), new Date(`${hasta}T23:59:59`)) as any },
      relations: ['lineas'],
    });
    for (const o of ordenes) {
      for (const l of o.lineas ?? []) {
        const baseL = Number(l.subtotal) || 0;
        if (baseL <= 0) continue;
        const tar = l.iva_tarifa || 'T13';
        const rate = RATE[tar] ?? 0.13;
        const ivaL = +(baseL * rate).toFixed(2);
        const b = ventasPorTarifa[tar] ?? { base: 0, iva: 0 };
        b.base += baseL; b.iva += ivaL; ventasPorTarifa[tar] = b;
        if (['Exento', 'NoSujeto'].includes(tar)) { if (tar === 'Exento') exentasBase += baseL; }
        else { gravadasBase += baseL; debito += ivaL; }
      }
    }

    // Crédito fiscal: gastos con IVA + IVA de importación de vehículos del mes
    const comprasPorTarifa: Record<string, { base: number; iva: number }> = {};
    let creditoBruto = 0;
    const gastos = await this.gastosRepo.find({ where: { fecha: Between(desde, hasta) as any } });
    for (const g of gastos) {
      const iva = Number(g.iva_monto) || 0;
      if (iva <= 0) continue;
      const base = Number(g.base_imponible) || (Number(g.monto) - iva);
      const key = g.iva_tarifa || 'T13';
      const b = comprasPorTarifa[key] ?? { base: 0, iva: 0 };
      b.base += base; b.iva += iva; comprasPorTarifa[key] = b;
      creditoBruto += iva;
    }
    const vehiculos = await this.vehiclesRepo.find({ where: { fecha_ingreso: Between(new Date(`${desde}T00:00:00`), new Date(`${hasta}T23:59:59`)) as any } });
    for (const v of vehiculos) {
      const iva = Number(v.iva_importacion) || 0;
      if (iva <= 0) continue;
      const b = comprasPorTarifa['T13'] ?? { base: 0, iva: 0 };
      b.iva += iva; comprasPorTarifa['T13'] = b;
      creditoBruto += iva;
    }

    // Notas de crédito/débito del mes: Crédito resta, Débito suma.
    const notas = await this.notasRepo.find({ where: { fecha: Between(desde, hasta) as any } });
    for (const n of notas) {
      const s = (n.tipo === 'Credito' ? -1 : 1);
      const base = (Number(n.base) || 0) * s;
      const iva = (Number(n.iva) || 0) * s;
      const tar = n.iva_tarifa || 'T13';
      if (n.naturaleza === 'Venta') {
        const b = ventasPorTarifa[tar] ?? { base: 0, iva: 0 };
        b.base += base; b.iva += iva; ventasPorTarifa[tar] = b;
        debito += iva; gravadasBase += base;
      } else {
        const b = comprasPorTarifa[tar] ?? { base: 0, iva: 0 };
        b.base += base; b.iva += iva; comprasPorTarifa[tar] = b;
        creditoBruto += iva;
      }
    }

    // Prorrata: ventas gravadas / (gravadas + exentas). NoSujeto se excluye.
    const denom = gravadasBase + exentasBase;
    const prorrata = denom > 0 ? +((gravadasBase / denom) * 100).toFixed(2) : 100;
    const creditoAplicable = +(creditoBruto * (prorrata / 100)).toFixed(2);

    // Saldo a favor del mes anterior
    const prev = await this.repo.findOneBy({ periodo: this.periodoMenosUno(periodo) });
    const saldoFavorAnterior = prev && Number(prev.iva_a_pagar) < 0 ? +Math.abs(Number(prev.iva_a_pagar)).toFixed(2) : 0;

    const retenciones = Number(opciones?.retenciones) || 0;
    const ivaAPagar = +(debito - creditoAplicable - retenciones - saldoFavorAnterior).toFixed(2);

    return {
      periodo,
      ventas_por_tarifa: ventasPorTarifa,
      compras_por_tarifa: comprasPorTarifa,
      debito_fiscal: +debito.toFixed(2),
      credito_fiscal_bruto: +creditoBruto.toFixed(2),
      porcentaje_prorrata: prorrata,
      credito_fiscal_aplicable: creditoAplicable,
      retenciones_iva: retenciones,
      saldo_a_favor_anterior: saldoFavorAnterior,
      iva_a_pagar: ivaAPagar,
    };
  }

  private periodoMenosUno(periodo: string): string {
    const [y, m] = periodo.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return d.toISOString().slice(0, 7);
  }

  // ── Listado / preview ──────────────────────────────────────────────────────
  async listar(): Promise<LiquidacionIVA[]> {
    return this.repo.find({ relations: ['generado_por'], order: { periodo: 'DESC' } });
  }
  async preview(periodo: string, retenciones?: number): Promise<any> {
    const existente = await this.repo.findOne({ where: { periodo }, relations: ['generado_por'] });
    const calc = await this.consolidar(periodo, { retenciones });
    return { existente, calc };
  }

  /**
   * Borrador XML del D-150 para conciliar/archivar. NO está firmado ni sigue el
   * esquema oficial de TRIBU-CR: es un export estructurado listo para adaptar a la
   * API cuando se tengan las llaves criptográficas.
   */
  async xmlD150(periodo: string): Promise<string> {
    const c: any = await this.consolidar(periodo);
    const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m] as string));
    const tarifas = (obj: Record<string, { base: number; iva: number }>) =>
      Object.entries(obj || {}).map(([k, v]) => `    <Linea tarifa="${k}"><Base>${v.base.toFixed(2)}</Base><Impuesto>${(v.iva || 0).toFixed(2)}</Impuesto></Linea>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- BORRADOR D-150 — no firmado. Adaptar al esquema oficial de TRIBU-CR al integrar la API. -->
<DeclaracionIVA formulario="D-150" periodo="${esc(periodo)}">
  <Ventas>
${tarifas(c.ventas_por_tarifa)}
  </Ventas>
  <Compras>
${tarifas(c.compras_por_tarifa)}
  </Compras>
  <Resumen>
    <DebitoFiscal>${Number(c.debito_fiscal).toFixed(2)}</DebitoFiscal>
    <CreditoFiscalBruto>${Number(c.credito_fiscal_bruto).toFixed(2)}</CreditoFiscalBruto>
    <Prorrata>${Number(c.porcentaje_prorrata).toFixed(2)}</Prorrata>
    <CreditoFiscalAplicable>${Number(c.credito_fiscal_aplicable).toFixed(2)}</CreditoFiscalAplicable>
    <Retenciones>${Number(c.retenciones_iva).toFixed(2)}</Retenciones>
    <ImpuestoAPagar>${Number(c.iva_a_pagar).toFixed(2)}</ImpuestoAPagar>
  </Resumen>
</DeclaracionIVA>`;
  }

  // ── Generar liquidación (consolida + asiento + estado Generada) ─────────────
  async generar(user: User, periodo: string, retenciones = 0, notas?: string): Promise<LiquidacionIVA> {
    let liq = await this.repo.findOneBy({ periodo });
    if (liq && (liq.estado === 'Presentada' || liq.estado === 'Pagada')) {
      throw new BadRequestException(`La liquidación de ${periodo} ya está ${liq.estado.toLowerCase()}.`);
    }
    const calc = await this.consolidar(periodo, { retenciones });

    // Asiento de liquidación: netea 2200 (débito) contra 1210 (crédito bruto), lleva el
    // no aplicable a gasto (5700) y deja el neto en 2210 IVA líquido (o saldo a favor).
    const c2200 = await this.contabilidad.asegurarCuenta('2200', { nombre: 'Impuestos por Pagar (IVA)', tipo: 'Pasivo' });
    const c1210 = await this.contabilidad.asegurarCuenta('1210', { nombre: 'IVA Acreditable (Crédito Fiscal)', tipo: 'Activo' });
    const c2210 = await this.contabilidad.asegurarCuenta('2210', { nombre: 'IVA Líquido por Pagar', tipo: 'Pasivo' });
    const c5700 = await this.contabilidad.asegurarCuenta('5700', { nombre: 'Otros Gastos', tipo: 'Gasto' });

    const debito = Number(calc.debito_fiscal) || 0;
    const bruto = Number(calc.credito_fiscal_bruto) || 0;
    const aplicable = Number(calc.credito_fiscal_aplicable) || 0;
    const noAplicable = +(bruto - aplicable).toFixed(2);
    const neto = Number(calc.iva_a_pagar) || 0; // puede ser negativo (saldo a favor)

    let asientoId: number | null = liq?.asiento_id ?? null;
    let pendienteContab = false;
    let errorContable: string | null = null;
    // Reversar asiento previo si se regenera
    if (liq?.asiento_id) {
      await this.contabilidad
        .reversarAsientosPorReferencia('LiquidacionIVA', liq.id, user, 'Regeneración')
        .catch((e) => this.logger.error(`Reversa liquidación IVA ${periodo}: ${e.message}`));
    }
    if (debito > 0 || bruto > 0) {
      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [];
      if (debito > 0) lineas.push({ cuentaId: c2200.id, debe: debito, haber: 0, descripcion: `Débito fiscal ${periodo}` });
      if (noAplicable > 0.01) lineas.push({ cuentaId: c5700.id, debe: noAplicable, haber: 0, descripcion: `IVA no deducible por prorrata ${periodo}` });
      if (bruto > 0) lineas.push({ cuentaId: c1210.id, debe: 0, haber: bruto, descripcion: `Crédito fiscal ${periodo}` });
      // Plug: 2210 neto (positivo = por pagar; negativo = saldo a favor → al debe).
      // Debe balancear contra el crédito EFECTIVAMENTE aplicado (1210 bruto se cancela
      // completo, pero la parte no deducible por prorrata va a 5700). Por eso el plug
      // es (débito − aplicable) = (débito − bruto + noAplicable), no (débito − bruto):
      // de lo contrario el asiento queda descuadrado por `noAplicable` y no cuadra.
      const plug = +(debito - aplicable).toFixed(2);
      if (plug > 0.01) lineas.push({ cuentaId: c2210.id, debe: 0, haber: plug, descripcion: `IVA por pagar ${periodo}` });
      else if (plug < -0.01) lineas.push({ cuentaId: c2210.id, debe: -plug, haber: 0, descripcion: `Saldo a favor IVA ${periodo}` });

      const asiento = await this.contabilidad.crearAsiento(user, {
        fecha: this.rangoMes(periodo).hasta,
        descripcion: `Liquidación de IVA — ${periodo} (D-150)`,
        tipo: 'Ajuste',
        referencia_tipo: 'LiquidacionIVA',
        referencia_id: liq?.id,
        lineas,
      }, { forzar: true }).catch((e) => {
        this.logger.error(`Asiento liquidación IVA ${periodo}: ${e.message}`);
        errorContable = e.message;
        return null;
      });
      if (asiento) asientoId = asiento.id;
      else { pendienteContab = true; } // se generó la liquidación pero el asiento falló
    }

    liq = liq ?? this.repo.create({ periodo });
    Object.assign(liq, calc);
    liq.estado = 'Generada';
    liq.retenciones_iva = retenciones;
    liq.notas = notas ?? liq.notas;
    liq.fecha_generacion = this.hoyCR();
    liq.generado_por = user;
    liq.asiento_id = asientoId;
    liq.pendiente_contabilizar = pendienteContab;
    liq.error_contable = errorContable;
    const saved = await this.repo.save(liq);

    // Vincular referencia del asiento a la liquidación ya persistida
    if (asientoId && !liq.asiento_id) { saved.asiento_id = asientoId; await this.repo.save(saved); }
    return saved;
  }

  async marcarPresentada(id: number): Promise<LiquidacionIVA> {
    const l = await this.repo.findOneBy({ id });
    if (!l) throw new NotFoundException('Liquidación no encontrada.');
    l.estado = 'Presentada'; l.fecha_presentacion = this.hoyCR();
    return this.repo.save(l);
  }

  async marcarPagada(id: number, user: User, cuentaBanco = '1110'): Promise<LiquidacionIVA> {
    const l = await this.repo.findOneBy({ id });
    if (!l) throw new NotFoundException('Liquidación no encontrada.');
    const aPagar = Number(l.iva_a_pagar) || 0;
    if (aPagar > 0) {
      const c2210 = await this.contabilidad.asegurarCuenta('2210', { nombre: 'IVA Líquido por Pagar', tipo: 'Pasivo' });
      const cBanco = await this.contabilidad.asegurarCuenta(cuentaBanco, { nombre: cuentaBanco === '1100' ? 'Caja' : 'Banco — Cuenta Corriente', tipo: 'Activo' });
      await this.contabilidad.crearAsiento(user, {
        fecha: this.hoyCR(),
        descripcion: `Pago de IVA — ${l.periodo}`,
        tipo: 'Ajuste', referencia_tipo: 'PagoIVA', referencia_id: l.id,
        lineas: [
          { cuentaId: c2210.id, debe: aPagar, haber: 0, descripcion: `Cancelación IVA ${l.periodo}` },
          { cuentaId: cBanco.id, debe: 0, haber: aPagar, descripcion: `Pago IVA ${l.periodo}` },
        ],
      }).catch((e) => this.logger.error(`Pago IVA: ${e.message}`));
    }
    l.estado = 'Pagada'; l.fecha_pago = this.hoyCR();
    return this.repo.save(l);
  }

  /** ¿Hay una declaración pendiente del mes anterior? (para banner/estado) */
  async pendienteActual(): Promise<{ periodo: string; pendiente: boolean; liquidacion: LiquidacionIVA | null }> {
    const periodo = this.periodoAnterior();
    const liq = await this.repo.findOneBy({ periodo });
    const pendiente = !liq || liq.estado === 'Pendiente' || liq.estado === 'Generada';
    return { periodo, pendiente, liquidacion: liq ?? null };
  }

  // ── Recordatorio automático (día 1 y luego diario hasta día 15) ─────────────
  @Cron('0 8 1-15 * *')
  async recordatorioIVA(): Promise<void> {
    const periodo = this.periodoAnterior();
    let liq = await this.repo.findOneBy({ periodo });
    if (!liq) {
      // Día 1: crear el pendiente del mes anterior
      liq = await this.repo.save(this.repo.create({ periodo, estado: 'Pendiente' }));
    }
    if (liq.estado === 'Presentada' || liq.estado === 'Pagada') return; // ya cumplido
    await this.notifs
      .createForAdminsAndContadores(`🧾 IVA de ${periodo}: declaración D-150 pendiente (vence los primeros 15 días).`, '/admin/obligaciones')
      .catch(() => {});
  }
}
