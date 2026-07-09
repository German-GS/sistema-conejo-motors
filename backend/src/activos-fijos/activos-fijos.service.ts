import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ActivoFijo, CategoriaActivo } from './activo-fijo.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

interface CrearActivoDto {
  nombre: string;
  categoria?: CategoriaActivo;
  cuenta_activo?: string;
  costo: number;
  valor_residual?: number;
  vida_util_meses?: number;
  vida_util_fiscal_meses?: number;
  metodo_fiscal?: string;
  metodo_depreciacion?: string;
  numero_inventario?: string;
  localizacion?: string;
  fecha_adquisicion?: string;
  contrapartida?: string; // cuenta que se acredita (2100 CxP por defecto, o 1110 Banco)
  notas?: string;
}

// Tasa de renta por defecto para estimar el impuesto diferido (editable en el reporte).
const TASA_RENTA_DEFAULT = 0.30;

@Injectable()
export class ActivosFijosService {
  constructor(
    @InjectRepository(ActivoFijo)
    private readonly activosRepo: Repository<ActivoFijo>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
    private readonly contabilidad: ContabilidadService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(ActivosFijosService.name);

  private hoyCR(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
  }
  private periodoActual(): string {
    return this.hoyCR().slice(0, 7); // YYYY-MM
  }

  /** Cuenta de depreciación acumulada según la cuenta del activo. */
  private cuentaDepAcumFor(cuentaActivo: string): { codigo: string; nombre: string } {
    if (cuentaActivo === '1520') return { codigo: '1525', nombre: 'Depreciación Acumulada — Vehículos Demo' };
    return { codigo: '1590', nombre: 'Depreciación Acumulada — Mobiliario y Equipo' };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async crear(dto: CrearActivoDto, userId?: number): Promise<ActivoFijo> {
    const costo = Number(dto.costo) || 0;
    if (costo <= 0) throw new BadRequestException('El costo del activo debe ser mayor a 0.');

    // Asegurar cuentas ANTES de la transacción (dato de referencia).
    const cuentaActivoCod = dto.cuenta_activo ?? '1510';
    const codContra = dto.contrapartida ?? '2100';
    const cActivo = await this.contabilidad.asegurarCuenta(cuentaActivoCod, { nombre: dto.nombre, tipo: 'Activo' });
    const cContra = await this.contabilidad.asegurarCuenta(codContra, {
      nombre: codContra === '2100' ? 'Cuentas por Pagar' : 'Banco — Cuenta Corriente',
      tipo: codContra === '2100' ? 'Pasivo' : 'Activo',
    });

    // Atómico: el activo y su asiento de alta se guardan (o se revierten) juntos.
    return this.dataSource.transaction(async (manager) => {
      const activo = await manager.getRepository(ActivoFijo).save(
        manager.getRepository(ActivoFijo).create({
          nombre: dto.nombre,
          categoria: dto.categoria ?? 'Otro',
          cuenta_activo: cuentaActivoCod,
          costo,
          valor_residual: Number(dto.valor_residual) || 0,
          vida_util_meses: Number(dto.vida_util_meses) || 60,
          vida_util_fiscal_meses: Number(dto.vida_util_fiscal_meses) || Number(dto.vida_util_meses) || 120,
          metodo_fiscal: dto.metodo_fiscal ?? 'LineaRecta',
          metodo_depreciacion: dto.metodo_depreciacion ?? 'LineaRecta',
          numero_inventario: dto.numero_inventario ?? null,
          localizacion: dto.localizacion ?? null,
          fecha_adquisicion: dto.fecha_adquisicion ?? this.hoyCR(),
          depreciacion_acumulada: 0,
          depreciacion_fiscal_acumulada: 0,
          activo: true,
          notas: dto.notas ?? null,
        }),
      );

      await this.contabilidad.crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
        fecha: activo.fecha_adquisicion,
        descripcion: `Alta de activo fijo — ${activo.nombre}`,
        tipo: 'Compra',
        referencia_id: activo.id,
        referencia_tipo: 'ActivoFijo',
        lineas: [
          { cuentaId: cActivo.id, debe: costo, haber: 0, descripcion: `Alta ${activo.nombre}` },
          { cuentaId: cContra.id, debe: 0, haber: costo, descripcion: `Contrapartida alta ${activo.nombre}` },
        ],
      }, { manager });

      return activo;
    });
  }

  async actualizar(id: number, dto: Partial<CrearActivoDto>): Promise<ActivoFijo> {
    const a = await this.activosRepo.findOneBy({ id });
    if (!a) throw new NotFoundException(`Activo #${id} no encontrado.`);
    // Solo campos descriptivos; el costo ya está asentado y no se re-asienta aquí.
    if (dto.nombre !== undefined) a.nombre = dto.nombre;
    if (dto.categoria !== undefined) a.categoria = dto.categoria;
    if (dto.vida_util_meses !== undefined) a.vida_util_meses = Number(dto.vida_util_meses) || a.vida_util_meses;
    if (dto.valor_residual !== undefined) a.valor_residual = Number(dto.valor_residual) || 0;
    if (dto.vida_util_fiscal_meses !== undefined) a.vida_util_fiscal_meses = Number(dto.vida_util_fiscal_meses) || a.vida_util_fiscal_meses;
    if (dto.metodo_fiscal !== undefined) a.metodo_fiscal = dto.metodo_fiscal;
    if (dto.metodo_depreciacion !== undefined) a.metodo_depreciacion = dto.metodo_depreciacion;
    if (dto.numero_inventario !== undefined) a.numero_inventario = dto.numero_inventario ?? null;
    if (dto.localizacion !== undefined) a.localizacion = dto.localizacion ?? null;
    if (dto.notas !== undefined) a.notas = dto.notas ?? null;
    return this.activosRepo.save(a);
  }

  /** Da de baja el activo (revierte activo y depreciación acumulada). */
  async darDeBaja(id: number, userId?: number): Promise<ActivoFijo> {
    const a = await this.activosRepo.findOneBy({ id });
    if (!a) throw new NotFoundException(`Activo #${id} no encontrado.`);
    if (!a.activo) return a;

    const costo = Number(a.costo) || 0;
    const acum = Number(a.depreciacion_acumulada) || 0;
    const neto = +(costo - acum).toFixed(2);

    try {
      const cActivo = await this.contabilidad.asegurarCuenta(a.cuenta_activo, { nombre: a.nombre, tipo: 'Activo' });
      const dep = this.cuentaDepAcumFor(a.cuenta_activo);
      const cDep = await this.contabilidad.asegurarCuenta(dep.codigo, { nombre: dep.nombre, tipo: 'Activo' });
      const perdida = await this.contabilidad.asegurarCuenta('5700', { nombre: 'Otros Gastos', tipo: 'Gasto' });

      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
        { cuentaId: cDep.id, debe: acum, haber: 0, descripcion: `Reversa dep. acumulada ${a.nombre}` },
        { cuentaId: cActivo.id, debe: 0, haber: costo, descripcion: `Baja activo ${a.nombre}` },
      ];
      if (neto > 0.01) lineas.push({ cuentaId: perdida.id, debe: neto, haber: 0, descripcion: `Pérdida por baja ${a.nombre}` });
      await this.contabilidad.crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
        fecha: this.hoyCR(),
        descripcion: `Baja de activo fijo — ${a.nombre}`,
        tipo: 'Ajuste',
        referencia_id: a.id,
        referencia_tipo: 'ActivoFijo_Baja',
        lineas,
      });
    } catch (e) {
      this.logger.error(`No se pudo postear la baja del activo #${a.id}: ${(e as Error).message}`);
    }

    a.activo = false;
    return this.activosRepo.save(a);
  }

  /** Vende un activo fijo: registra el efectivo recibido y la ganancia/pérdida vs. valor neto. */
  async vender(id: number, montoVenta: number, contrapartida = '1110', userId?: number): Promise<ActivoFijo> {
    const a = await this.activosRepo.findOneBy({ id });
    if (!a) throw new NotFoundException(`Activo #${id} no encontrado.`);
    if (!a.activo) throw new BadRequestException('El activo ya está dado de baja o vendido.');
    const monto = Number(montoVenta) || 0;
    if (monto < 0) throw new BadRequestException('El monto de venta no puede ser negativo.');

    const costo = Number(a.costo) || 0;
    const acum = Number(a.depreciacion_acumulada) || 0;
    const neto = +(costo - acum).toFixed(2);
    const resultado = +(monto - neto).toFixed(2); // + ganancia / − pérdida

    try {
      const cActivo = await this.contabilidad.asegurarCuenta(a.cuenta_activo, { nombre: a.nombre, tipo: 'Activo' });
      const dep = this.cuentaDepAcumFor(a.cuenta_activo);
      const cDep = await this.contabilidad.asegurarCuenta(dep.codigo, { nombre: dep.nombre, tipo: 'Activo' });
      const cCobro = await this.contabilidad.asegurarCuenta(contrapartida, {
        nombre: contrapartida === '1100' ? 'Caja' : 'Banco — Cuenta Corriente', tipo: 'Activo',
      });

      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [];
      if (monto > 0) lineas.push({ cuentaId: cCobro.id, debe: monto, haber: 0, descripcion: `Cobro venta ${a.nombre}` });
      if (acum > 0) lineas.push({ cuentaId: cDep.id, debe: acum, haber: 0, descripcion: `Reversa dep. acumulada ${a.nombre}` });
      lineas.push({ cuentaId: cActivo.id, debe: 0, haber: costo, descripcion: `Baja por venta ${a.nombre}` });
      if (resultado > 0.01) {
        const cGanancia = await this.contabilidad.asegurarCuenta('4300', { nombre: 'Otros Ingresos', tipo: 'Ingreso' });
        lineas.push({ cuentaId: cGanancia.id, debe: 0, haber: resultado, descripcion: `Ganancia en venta de activo ${a.nombre}` });
      } else if (resultado < -0.01) {
        const cPerdida = await this.contabilidad.asegurarCuenta('5700', { nombre: 'Otros Gastos', tipo: 'Gasto' });
        lineas.push({ cuentaId: cPerdida.id, debe: -resultado, haber: 0, descripcion: `Pérdida en venta de activo ${a.nombre}` });
      }

      await this.contabilidad.crearAsiento(userId ? ({ id: userId } as any) : (undefined as any), {
        fecha: this.hoyCR(),
        descripcion: `Venta de activo fijo — ${a.nombre}`,
        tipo: 'Ajuste',
        referencia_id: a.id,
        referencia_tipo: 'ActivoFijo_Venta',
        lineas,
      });
    } catch (e) {
      this.logger.error(`No se pudo postear la venta del activo #${a.id}: ${(e as Error).message}`);
    }

    a.activo = false;
    a.notas = `${a.notas ?? ''}\n[Vendido ${this.hoyCR()} por ₡${monto}]`.trim();
    return this.activosRepo.save(a);
  }

  // ── Listado consolidado (activos fijos genéricos + vehículos demo) ─────────

  async listar(): Promise<any> {
    const activos = await this.activosRepo.find({ order: { creado_en: 'DESC' } });
    const demos = await this.vehiclesRepo.find({ where: { estado: 'Demo' } });

    const genericos = activos.map((a) => {
      const costo = Number(a.costo) || 0;
      const acum = Number(a.depreciacion_acumulada) || 0;
      return {
        tipo: 'Activo' as const,
        id: a.id,
        nombre: a.nombre,
        categoria: a.categoria,
        cuenta: a.cuenta_activo,
        costo,
        depreciacion_acumulada: acum,
        valor_neto: +(costo - acum).toFixed(2),
        vida_util_meses: a.vida_util_meses,
        valor_residual: Number(a.valor_residual) || 0,
        vida_util_fiscal_meses: a.vida_util_fiscal_meses,
        metodo_fiscal: a.metodo_fiscal,
        dep_fiscal_acumulada: Number(a.depreciacion_fiscal_acumulada) || 0,
        numero_inventario: a.numero_inventario ?? '',
        localizacion: a.localizacion ?? '',
        notas: a.notas ?? '',
        fecha: a.fecha_adquisicion,
        activo: a.activo,
      };
    });

    const vehiculosDemo = demos.map((v) => {
      const costo = Number(v.precio_costo) || 0;
      const acum = Number(v.depreciacion_acumulada) || 0;
      return {
        tipo: 'Vehículo Demo' as const,
        id: v.id,
        nombre: `${v.marca} ${v.modelo} (VIN ${v.vin})`,
        categoria: 'Vehículo Demo',
        cuenta: '1520',
        costo,
        depreciacion_acumulada: acum,
        valor_neto: +(costo - acum).toFixed(2),
        vida_util_meses: Number(v.vida_util_meses_demo) || 60,
        valor_residual: Number(v.valor_residual_demo) || 0,
        vida_util_fiscal_meses: Number(v.vida_util_fiscal_meses_demo) || 120,
        dep_fiscal_acumulada: Number(v.depreciacion_fiscal_acumulada_demo) || 0,
        placa: v.placa ?? '',
        marchamo: Number(v.marchamo) || 0,
        fecha: v.fecha_demo_desde,
        activo: true,
      };
    });

    const items = [...vehiculosDemo, ...genericos];
    const totales = items.reduce(
      (t, i) => {
        t.costo += i.costo;
        t.depreciacion_acumulada += i.depreciacion_acumulada;
        t.valor_neto += i.valor_neto;
        return t;
      },
      { costo: 0, depreciacion_acumulada: 0, valor_neto: 0 },
    );

    return {
      items,
      totales: {
        costo: +totales.costo.toFixed(2),
        depreciacion_acumulada: +totales.depreciacion_acumulada.toFixed(2),
        valor_neto: +totales.valor_neto.toFixed(2),
      },
    };
  }

  // ── Depreciación mensual de activos genéricos (día 1, 06:10 UTC) ──────────

  @Cron('0 10 1 * *')
  async depreciarActivos(): Promise<void> {
    const periodo = this.periodoActual();
    const activos = await this.activosRepo.find({ where: { activo: true } });
    if (!activos.length) return;

    const gasto = await this.contabilidad.asegurarCuenta('5450', { nombre: 'Gasto por Depreciación', tipo: 'Gasto' });

    for (const a of activos) {
      if (a.ultimo_periodo_depreciado === periodo) continue; // ya depreciado este mes
      const costo = Number(a.costo) || 0;
      const residual = Number(a.valor_residual) || 0;
      const base = costo - residual;
      if (base <= 0 || a.vida_util_meses <= 0) continue;
      const acum = Number(a.depreciacion_acumulada) || 0;
      if (acum >= base) continue;

      const cuota = Math.min(+(base / a.vida_util_meses).toFixed(2), +(base - acum).toFixed(2));
      if (cuota <= 0) continue;

      const dep = this.cuentaDepAcumFor(a.cuenta_activo);
      const cDep = await this.contabilidad.asegurarCuenta(dep.codigo, { nombre: dep.nombre, tipo: 'Activo' });

      try {
        await this.contabilidad.crearAsiento(undefined as any, {
          fecha: this.hoyCR(),
          descripcion: `Depreciación mensual — ${a.nombre}`,
          tipo: 'Ajuste',
          referencia_id: a.id,
          referencia_tipo: 'Depreciacion_ActivoFijo',
          lineas: [
            { cuentaId: gasto.id, debe: cuota, haber: 0, descripcion: `Depreciación ${a.nombre}` },
            { cuentaId: cDep.id, debe: 0, haber: cuota, descripcion: `Dep. acumulada ${a.nombre}` },
          ],
        });
        a.depreciacion_acumulada = +(acum + cuota).toFixed(2);
        a.ultimo_periodo_depreciado = periodo;
        await this.activosRepo.save(a);
      } catch (e) {
        this.logger.error(`Depreciación del activo #${a.id} falló: ${(e as Error).message}`);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARRIL FISCAL (Anexo Nº 2) — cálculo paralelo, NO genera asientos.
  //   Base = costo total (sin valor residual). Vida útil fiscal. Línea recta o
  //   suma de dígitos. Prorrateo del primer mes por la fecha de adquisición.
  // ══════════════════════════════════════════════════════════════════════════

  /** Nº de meses transcurridos desde la adquisición hasta el período (1-indexado). */
  private indiceMesFiscal(fechaAdq: string, periodo: string): number {
    const [ay, am] = fechaAdq.slice(0, 7).split('-').map(Number);
    const [py, pm] = periodo.split('-').map(Number);
    return (py - ay) * 12 + (pm - am) + 1;
  }

  /** Factor de prorrateo del primer mes: proporción de días de uso dentro del mes de adquisición. */
  private factorPrimerMes(fechaAdq: string): number {
    const d = new Date(`${fechaAdq}T00:00:00`);
    const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const diasUso = diasMes - d.getDate() + 1;
    return Math.min(1, Math.max(0, diasUso / diasMes));
  }

  /** Cuota fiscal del período para un activo (base = costo, sin residual). */
  private cuotaFiscal(base: number, vidaMeses: number, metodo: string, k: number, acum: number, fechaAdq: string): number {
    if (base <= 0 || vidaMeses <= 0 || acum >= base) return 0;
    let cuota: number;
    if (metodo === 'SumaDigitos') {
      // Suma de dígitos mensual: peso del mes k = (N − k + 1); Σ = N(N+1)/2
      const peso = Math.max(0, vidaMeses - k + 1);
      const suma = (vidaMeses * (vidaMeses + 1)) / 2;
      cuota = base * (peso / suma);
    } else {
      cuota = base / vidaMeses;
      if (k === 1) cuota *= this.factorPrimerMes(fechaAdq); // prorrateo primer mes (línea recta)
    }
    return Math.min(+cuota.toFixed(2), +(base - acum).toFixed(2));
  }

  /** Cron fiscal mensual (día 1, 06:20 UTC). Actualiza el subledger fiscal; sin asientos. */
  @Cron('0 20 1 * *')
  async depreciarFiscalActivos(): Promise<void> {
    const periodo = this.periodoActual();
    const activos = await this.activosRepo.find({ where: { activo: true } });
    for (const a of activos) {
      if (a.ultimo_periodo_fiscal === periodo) continue;
      const base = Number(a.costo) || 0;
      const acum = Number(a.depreciacion_fiscal_acumulada) || 0;
      const k = this.indiceMesFiscal(a.fecha_adquisicion, periodo);
      if (k < 1) continue; // aún no inicia el uso fiscal
      const cuota = this.cuotaFiscal(base, Number(a.vida_util_fiscal_meses) || 120, a.metodo_fiscal || 'LineaRecta', k, acum, a.fecha_adquisicion);
      if (cuota <= 0) { a.ultimo_periodo_fiscal = periodo; await this.activosRepo.save(a); continue; }
      a.depreciacion_fiscal_acumulada = +(acum + cuota).toFixed(2);
      a.ultimo_periodo_fiscal = periodo;
      await this.activosRepo.save(a);
    }
  }

  /**
   * Reporte de diferencia libro-fiscal (base del impuesto diferido).
   * Combina activos genéricos + vehículos demo. tasaRenta editable (default 30%).
   */
  async reporteFiscal(tasaRenta = TASA_RENTA_DEFAULT): Promise<any> {
    const activos = await this.activosRepo.find({ where: { activo: true }, order: { creado_en: 'DESC' } });
    const demos = await this.vehiclesRepo.find({ where: { estado: 'Demo' } });

    const items = [
      ...demos.map((v) => {
        const fin = Number(v.depreciacion_acumulada) || 0;
        const fis = Number(v.depreciacion_fiscal_acumulada_demo) || 0;
        return {
          tipo: 'Vehículo Demo', id: v.id, nombre: `${v.marca} ${v.modelo} (VIN ${v.vin})`,
          costo: Number(v.precio_costo) || 0,
          dep_financiera: fin, dep_fiscal: fis, diferencia: +(fin - fis).toFixed(2),
          vida_financiera: Number(v.vida_util_meses_demo) || 60, vida_fiscal: Number(v.vida_util_fiscal_meses_demo) || 120,
        };
      }),
      ...activos.map((a) => {
        const fin = Number(a.depreciacion_acumulada) || 0;
        const fis = Number(a.depreciacion_fiscal_acumulada) || 0;
        return {
          tipo: 'Activo', id: a.id, nombre: a.nombre, costo: Number(a.costo) || 0,
          dep_financiera: fin, dep_fiscal: fis, diferencia: +(fin - fis).toFixed(2),
          vida_financiera: a.vida_util_meses, vida_fiscal: a.vida_util_fiscal_meses,
        };
      }),
    ];

    const totalDif = +items.reduce((s, i) => s + i.diferencia, 0).toFixed(2);
    return {
      tasa_renta: tasaRenta,
      items,
      totales: {
        dep_financiera: +items.reduce((s, i) => s + i.dep_financiera, 0).toFixed(2),
        dep_fiscal: +items.reduce((s, i) => s + i.dep_fiscal, 0).toFixed(2),
        diferencia_temporaria: totalDif,
        // Diferencia positiva (gasto contable > deducible) → activo por impuesto diferido.
        impuesto_diferido: +(totalDif * tasaRenta).toFixed(2),
      },
    };
  }
}
