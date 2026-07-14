import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { CuentaPagar } from '../cxp/cuenta-pagar.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { TipoCambioService } from './tipo-cambio.service';
import { User } from '../users/user.entity';

@Injectable()
export class DiferencialCambiarioService {
  private readonly logger = new Logger(DiferencialCambiarioService.name);

  constructor(
    @InjectRepository(CuentaCobrar) private cxcRepo: Repository<CuentaCobrar>,
    @InjectRepository(CuentaPagar) private cxpRepo: Repository<CuentaPagar>,
    private readonly contabilidad: ContabilidadService,
    private readonly tipoCambio: TipoCambioService,
  ) {}

  private ultimoDia(periodo: string): string {
    const [y, m] = periodo.split('-').map(Number);
    return new Date(y, m, 0).toLocaleDateString('en-CA');
  }
  private refId(periodo: string): number {
    return Number(periodo.replace('-', '')); // 2026-05 → 202605
  }

  /**
   * Revalúa los saldos monetarios en USD (CxC/CxP) al TC de cierre del período y postea
   * el diferencial cambiario. Idempotente por período: si ya existe el asiento, no duplica.
   */
  async revaluarPeriodo(user: User, periodo: string, tcCierreParam?: number): Promise<any> {
    if (!/^\d{4}-\d{2}$/.test(periodo)) throw new BadRequestException("El período debe ser 'YYYY-MM'.");
    const refId = this.refId(periodo);
    if (await this.contabilidad.existeAsientoPorReferencia('DiferencialCambiario', refId)) {
      return { periodo, yaRevaluado: true, mensaje: 'El diferencial de este período ya fue registrado.' };
    }
    const fecha = this.ultimoDia(periodo);
    const tcCierre = tcCierreParam && tcCierreParam > 0 ? tcCierreParam : await this.tipoCambio.getVenta(fecha);
    if (!tcCierre || tcCierre <= 0) {
      throw new BadRequestException('No hay tipo de cambio de cierre. Cargá el TC del período o pasalo manualmente.');
    }

    const round = (n: number) => +Number(n).toFixed(2);
    const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [];
    const detalle: any[] = [];

    const cGanancia = await this.contabilidad.asegurarCuenta('4310', { nombre: 'Diferencial Cambiario (Ganancia)', tipo: 'Ingreso' });
    const cPerdida = await this.contabilidad.asegurarCuenta('5600', { nombre: 'Gastos Financieros', tipo: 'Gasto' });
    const c1200 = await this.contabilidad.asegurarCuenta('1200', { nombre: 'Cuentas por Cobrar', tipo: 'Activo' });
    const c2100 = await this.contabilidad.asegurarCuenta('2100', { nombre: 'Cuentas por Pagar', tipo: 'Pasivo' });

    // ── CxC en USD (activo monetario) ──
    const cxcUsd = await this.cxcRepo.find({ where: { moneda: 'USD', estado: Not('Anulado') as any } });
    for (const d of cxcUsd) {
      const saldo = Number(d.saldo_pendiente) || 0;
      const tcDoc = Number(d.tipo_cambio) || 0;
      if (saldo <= 0 || tcDoc <= 0) continue;
      const usd = saldo / tcDoc;
      const revaluado = round(usd * tcCierre);
      const dif = round(revaluado - saldo);
      if (Math.abs(dif) < 0.01) continue;
      if (dif > 0) { // el activo vale más → ganancia
        lineas.push({ cuentaId: c1200.id, debe: dif, haber: 0, descripcion: `Revaluación CxC ${d.numero}` });
        lineas.push({ cuentaId: cGanancia.id, debe: 0, haber: dif, descripcion: `Ganancia cambiaria ${d.numero}` });
      } else {
        lineas.push({ cuentaId: cPerdida.id, debe: -dif, haber: 0, descripcion: `Pérdida cambiaria ${d.numero}` });
        lineas.push({ cuentaId: c1200.id, debe: 0, haber: -dif, descripcion: `Revaluación CxC ${d.numero}` });
      }
      detalle.push({ tipo: 'CxC', numero: d.numero, usd: round(usd), tcAnterior: tcDoc, tcCierre, saldoAnterior: saldo, saldoNuevo: revaluado, diferencia: dif });
      d.saldo_pendiente = revaluado; d.tipo_cambio = tcCierre;
      await this.cxcRepo.save(d);
    }

    // ── CxP en USD (pasivo monetario) ──
    const cxpUsd = await this.cxpRepo.find({ where: { moneda: 'USD', estado: Not('Anulado') as any } });
    for (const d of cxpUsd) {
      const saldo = Number(d.saldo_pendiente) || 0;
      const tcDoc = Number(d.tipo_cambio) || 0;
      if (saldo <= 0 || tcDoc <= 0) continue;
      const usd = saldo / tcDoc;
      const revaluado = round(usd * tcCierre);
      const dif = round(revaluado - saldo);
      if (Math.abs(dif) < 0.01) continue;
      if (dif > 0) { // se debe más en colones → pérdida
        lineas.push({ cuentaId: cPerdida.id, debe: dif, haber: 0, descripcion: `Pérdida cambiaria ${d.numero}` });
        lineas.push({ cuentaId: c2100.id, debe: 0, haber: dif, descripcion: `Revaluación CxP ${d.numero}` });
      } else { // se debe menos → ganancia
        lineas.push({ cuentaId: c2100.id, debe: -dif, haber: 0, descripcion: `Revaluación CxP ${d.numero}` });
        lineas.push({ cuentaId: cGanancia.id, debe: 0, haber: -dif, descripcion: `Ganancia cambiaria ${d.numero}` });
      }
      detalle.push({ tipo: 'CxP', numero: d.numero, usd: round(usd), tcAnterior: tcDoc, tcCierre, saldoAnterior: saldo, saldoNuevo: revaluado, diferencia: dif });
      d.saldo_pendiente = revaluado; d.tipo_cambio = tcCierre;
      await this.cxpRepo.save(d);
    }

    if (!lineas.length) {
      return { periodo, tcCierre, sinDiferencias: true, mensaje: 'No hay documentos en USD con diferencia que revaluar.' };
    }

    const asiento = await this.contabilidad.crearAsiento(user, {
      fecha,
      descripcion: `Diferencial cambiario — ${periodo} (TC cierre ₡${tcCierre})`,
      tipo: 'Ajuste',
      referencia_tipo: 'DiferencialCambiario',
      referencia_id: refId,
      lineas,
    }, { forzar: true });

    return { periodo, tcCierre, asientoId: asiento.id, documentos: detalle.length, detalle };
  }

  /** Cron: revalúa el mes anterior el día 1 a las 07:30 UTC. */
  @Cron('0 30 7 1 * *')
  async cronRevaluacion(): Promise<void> {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    const periodo = d.toISOString().slice(0, 7);
    try {
      await this.tipoCambio.sincronizarHoy().catch(() => null);
      const res = await this.revaluarPeriodo(undefined as any, periodo);
      this.logger.log(`[Diferencial cambiario] ${periodo}: ${JSON.stringify({ ...res, detalle: undefined })}`);
    } catch (e) {
      this.logger.warn(`[Diferencial cambiario] ${periodo} falló: ${(e as Error).message}`);
    }
  }
}
