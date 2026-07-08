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
  fecha_adquisicion?: string;
  contrapartida?: string; // cuenta que se acredita (2100 CxP por defecto, o 1110 Banco)
  notas?: string;
}

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
          fecha_adquisicion: dto.fecha_adquisicion ?? this.hoyCR(),
          depreciacion_acumulada: 0,
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
        vida_util_meses: 60,
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
}
