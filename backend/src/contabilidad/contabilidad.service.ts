import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, EntityManager } from 'typeorm';
import { CuentaContable } from './cuenta.entity';
import { AsientoContable, LineaAsiento, TipoAsiento } from './asiento.entity';
import { CierreDiario } from './cierre-diario.entity';
import { CierrePeriodo, TipoCierre } from './cierre-periodo.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ContabilidadService {
  constructor(
    @InjectRepository(CuentaContable)
    private cuentasRepo: Repository<CuentaContable>,
    @InjectRepository(AsientoContable)
    private asientosRepo: Repository<AsientoContable>,
    @InjectRepository(LineaAsiento)
    private lineasRepo: Repository<LineaAsiento>,
    @InjectRepository(CierreDiario)
    private cierresRepo: Repository<CierreDiario>,
    @InjectRepository(CierrePeriodo)
    private cierrePeriodosRepo: Repository<CierrePeriodo>,
  ) {}

  // ── Plan de Cuentas ───────────────────────────────────────────────────────

  async getCuentas(): Promise<CuentaContable[]> {
    return this.cuentasRepo.find({ order: { codigo: 'ASC' } });
  }

  async createCuenta(data: Partial<CuentaContable>): Promise<CuentaContable> {
    const exists = await this.cuentasRepo.findOneBy({ codigo: data.codigo });
    if (exists) throw new BadRequestException(`Ya existe una cuenta con código ${data.codigo}.`);
    return this.cuentasRepo.save(this.cuentasRepo.create(data));
  }

  async updateCuenta(id: number, data: Partial<CuentaContable>): Promise<CuentaContable> {
    const c = await this.cuentasRepo.findOneBy({ id });
    if (!c) throw new NotFoundException(`Cuenta #${id} no encontrada.`);
    Object.assign(c, data);
    return this.cuentasRepo.save(c);
  }

  /** Inicializa el plan de cuentas estándar si está vacío */
  async seedCuentasEstandar(): Promise<{ seeded: number }> {
    const count = await this.cuentasRepo.count();
    if (count > 0) return { seeded: 0 };

    const cuentas: Partial<CuentaContable>[] = [
      // ACTIVOS
      { codigo: '1000', nombre: 'ACTIVOS', tipo: 'Activo', acepta_movimientos: false, descripcion: 'Grupo: Activos' },
      { codigo: '1100', nombre: 'Caja', tipo: 'Activo', descripcion: 'Efectivo en caja' },
      { codigo: '1110', nombre: 'Banco — Cuenta Corriente', tipo: 'Activo', descripcion: 'Saldo en banco cuenta corriente' },
      { codigo: '1120', nombre: 'Banco — Cuenta de Ahorros', tipo: 'Activo', descripcion: 'Saldo en banco cuenta ahorros' },
      { codigo: '1200', nombre: 'Cuentas por Cobrar', tipo: 'Activo', descripcion: 'Clientes con deuda pendiente' },
      { codigo: '1210', nombre: 'IVA Acreditable (Crédito Fiscal)', tipo: 'Activo', descripcion: 'IVA pagado en importaciones/compras, recuperable contra el IVA de ventas' },
      { codigo: '1300', nombre: 'Inventario Vehículos', tipo: 'Activo', descripcion: 'Valor de vehículos en stock' },
      { codigo: '1400', nombre: 'Inventario Repuestos y Accesorios', tipo: 'Activo', descripcion: 'Valor de productos en stock' },
      { codigo: '1500', nombre: 'Activos Fijos', tipo: 'Activo', acepta_movimientos: false },
      { codigo: '1510', nombre: 'Mobiliario y Equipo', tipo: 'Activo' },
      { codigo: '1520', nombre: 'Vehículos Demo / Uso Interno', tipo: 'Activo', descripcion: 'Unidades de test drive / uso interno (no para venta)' },
      { codigo: '1525', nombre: 'Depreciación Acumulada — Vehículos Demo', tipo: 'Activo', descripcion: 'Contra-activo: depreciación acumulada de unidades demo' },
      { codigo: '1590', nombre: 'Depreciación Acumulada — Mobiliario y Equipo', tipo: 'Activo', descripcion: 'Contra-activo: depreciación acumulada de activos fijos (no vehículos)' },
      // PASIVOS
      { codigo: '2000', nombre: 'PASIVOS', tipo: 'Pasivo', acepta_movimientos: false },
      { codigo: '2100', nombre: 'Cuentas por Pagar', tipo: 'Pasivo' },
      { codigo: '2200', nombre: 'Impuestos por Pagar (IVA)', tipo: 'Pasivo' },
      { codigo: '2300', nombre: 'Provisiones y Accruals', tipo: 'Pasivo' },
      // PATRIMONIO
      { codigo: '3000', nombre: 'PATRIMONIO', tipo: 'Patrimonio', acepta_movimientos: false },
      { codigo: '3100', nombre: 'Capital Social', tipo: 'Patrimonio' },
      { codigo: '3200', nombre: 'Utilidades Retenidas', tipo: 'Patrimonio' },
      { codigo: '3300', nombre: 'Utilidad / Pérdida del Período', tipo: 'Patrimonio' },
      // INGRESOS
      { codigo: '4000', nombre: 'INGRESOS', tipo: 'Ingreso', acepta_movimientos: false },
      { codigo: '4100', nombre: 'Ventas de Vehículos', tipo: 'Ingreso' },
      { codigo: '4200', nombre: 'Ventas de Repuestos y Accesorios', tipo: 'Ingreso' },
      { codigo: '4300', nombre: 'Otros Ingresos', tipo: 'Ingreso' },
      // GASTOS
      { codigo: '5000', nombre: 'GASTOS', tipo: 'Gasto', acepta_movimientos: false },
      { codigo: '5100', nombre: 'Costo de Ventas — Vehículos', tipo: 'Gasto' },
      { codigo: '5200', nombre: 'Costo de Ventas — Repuestos', tipo: 'Gasto' },
      { codigo: '5300', nombre: 'Gastos de Personal', tipo: 'Gasto' },
      { codigo: '5400', nombre: 'Gastos de Administración', tipo: 'Gasto' },
      { codigo: '5500', nombre: 'Gastos de Ventas y Comisiones', tipo: 'Gasto' },
      { codigo: '5450', nombre: 'Gasto por Depreciación', tipo: 'Gasto', descripcion: 'Depreciación de activos fijos (incl. vehículos demo)' },
      { codigo: '5600', nombre: 'Gastos Financieros', tipo: 'Gasto' },
      { codigo: '5700', nombre: 'Otros Gastos', tipo: 'Gasto' },
      // PATRIMONIO — apertura
      { codigo: '3900', nombre: 'Balance de Apertura', tipo: 'Patrimonio', descripcion: 'Contrapartida de la carga inicial de saldos' },
    ];

    let seeded = 0;
    for (const c of cuentas) {
      const cuenta = this.cuentasRepo.create(c);
      await this.cuentasRepo.save(cuenta);
      seeded++;
    }
    return { seeded };
  }

  // ── Asientos Contables ────────────────────────────────────────────────────

  async getAsientos(startDate?: string, endDate?: string): Promise<AsientoContable[]> {
    const hoy = new Date().toISOString().split('T')[0];
    const desde = startDate ?? hoy;
    const hasta  = endDate   ?? hoy;
    return this.asientosRepo.find({
      where: { fecha: Between(desde as any, hasta as any) },
      relations: ['lineas', 'lineas.cuenta', 'creado_por'],
      order: { fecha: 'DESC', fecha_creacion: 'DESC' },
    });
  }

  async getAsiento(id: number): Promise<AsientoContable> {
    const a = await this.asientosRepo.findOne({
      where: { id },
      relations: ['lineas', 'lineas.cuenta', 'creado_por'],
    });
    if (!a) throw new NotFoundException(`Asiento #${id} no encontrado.`);
    return a;
  }

  /** Devuelve el cierre que bloquea esa fecha (mes o año cerrado), o null. */
  async periodoQueBloquea(fecha: string, manager?: EntityManager): Promise<CierrePeriodo | null> {
    const repo = manager ? manager.getRepository(CierrePeriodo) : this.cierrePeriodosRepo;
    const mes = fecha.slice(0, 7); // YYYY-MM
    const anio = fecha.slice(0, 4); // YYYY
    const cierre = await repo.findOne({
      where: [
        { periodo: mes, cerrado: true },
        { periodo: anio, cerrado: true },
      ],
    });
    return cierre ?? null;
  }

  async crearAsiento(
    user: User,
    body: {
      fecha: string;
      descripcion: string;
      tipo?: TipoAsiento;
      referencia_id?: number;
      referencia_tipo?: string;
      lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[];
    },
    opciones?: { forzar?: boolean; manager?: EntityManager },
  ): Promise<AsientoContable> {
    // Repos: si viene un EntityManager (transacción), usarlo; si no, los inyectados.
    const mgr = opciones?.manager;
    const asientosRepo = mgr ? mgr.getRepository(AsientoContable) : this.asientosRepo;
    const lineasRepo   = mgr ? mgr.getRepository(LineaAsiento)   : this.lineasRepo;
    const cuentasRepo  = mgr ? mgr.getRepository(CuentaContable) : this.cuentasRepo;

    // Bloqueo de período cerrado (salvo que se fuerce, p.ej. Admin o el propio cierre)
    if (!opciones?.forzar) {
      const bloqueo = await this.periodoQueBloquea(body.fecha, mgr);
      if (bloqueo) {
        throw new BadRequestException(
          `El período ${bloqueo.periodo} está cerrado; no se pueden registrar asientos con fecha ${body.fecha}. Un administrador puede forzar un asiento de ajuste.`,
        );
      }
    }

    // Validar partida doble: suma debe = suma haber
    const sumaDebe  = body.lineas.reduce((s, l) => s + (l.debe  ?? 0), 0);
    const sumaHaber = body.lineas.reduce((s, l) => s + (l.haber ?? 0), 0);
    if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
      throw new BadRequestException(
        `El asiento no cuadra: Debe=${sumaDebe.toFixed(2)} ≠ Haber=${sumaHaber.toFixed(2)}`,
      );
    }

    const asiento = asientosRepo.create({
      fecha: body.fecha,
      descripcion: body.descripcion,
      tipo: body.tipo ?? 'Manual',
      referencia_id: body.referencia_id,
      referencia_tipo: body.referencia_tipo,
      creado_por: user,
    });
    const saved = await asientosRepo.save(asiento);

    for (const l of body.lineas) {
      const cuenta = await cuentasRepo.findOneBy({ id: l.cuentaId });
      if (!cuenta) throw new NotFoundException(`Cuenta #${l.cuentaId} no encontrada.`);
      const linea = lineasRepo.create({
        asiento: saved,
        cuenta,
        debe:  l.debe  ?? 0,
        haber: l.haber ?? 0,
        descripcion: l.descripcion,
      });
      await lineasRepo.save(linea);
    }

    return asientosRepo.findOne({
      where: { id: saved.id },
      relations: ['lineas', 'lineas.cuenta', 'creado_por'],
    }) as Promise<AsientoContable>;
  }

  /**
   * Anula contablemente los asientos ligados a una referencia mediante ASIENTOS DE
   * REVERSA (débito/crédito invertidos), en vez de borrarlos físicamente. Preserva la
   * pista de auditoría. Idempotente: no re-reversa lo ya reversado. Devuelve cuántos revirtió.
   */
  async reversarAsientosPorReferencia(
    referencia_tipo: string,
    referencia_id: number,
    user?: User,
    motivo?: string,
  ): Promise<number> {
    const asientos = await this.asientosRepo.find({
      where: { referencia_tipo, referencia_id },
      relations: ['lineas', 'lineas.cuenta'],
    });
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    let count = 0;
    for (const a of asientos) {
      // Idempotencia: si ya existe la reversa de este asiento, saltar.
      const yaReversado = await this.asientosRepo.count({
        where: { referencia_tipo: 'Reversa', referencia_id: a.id },
      });
      if (yaReversado > 0) continue;

      await this.crearAsiento(
        (user ?? undefined) as any,
        {
          fecha: hoy,
          descripcion: `Reversa de asiento #${a.id} — ${a.descripcion}${motivo ? ` (${motivo})` : ''}`,
          tipo: 'Ajuste',
          referencia_id: a.id,
          referencia_tipo: 'Reversa',
          lineas: a.lineas.map((l) => ({
            cuentaId: l.cuenta.id,
            debe: Number(l.haber) || 0,
            haber: Number(l.debe) || 0,
            descripcion: `Reversa — ${l.descripcion ?? ''}`,
          })),
        },
        { forzar: true },
      );
      count++;
    }
    return count;
  }

  /** @deprecated Usar reversarAsientosPorReferencia. Se mantiene por compatibilidad de llamadores. */
  async eliminarAsientosPorReferencia(
    referencia_tipo: string,
    referencia_id: number,
  ): Promise<number> {
    return this.reversarAsientosPorReferencia(referencia_tipo, referencia_id);
  }

  /** Devuelve la cuenta con ese código; si no existe (plan ya sembrado antes), la crea. */
  async asegurarCuenta(
    codigo: string,
    defaults: Partial<CuentaContable>,
  ): Promise<CuentaContable> {
    let c = await this.cuentasRepo.findOneBy({ codigo });
    if (!c) {
      c = await this.cuentasRepo.save(
        this.cuentasRepo.create({ codigo, acepta_movimientos: true, ...defaults }),
      );
    }
    return c;
  }

  /** ¿Existe ya al menos un asiento para esta referencia? (idempotencia) */
  async existeAsientoPorReferencia(
    referencia_tipo: string,
    referencia_id: number,
  ): Promise<boolean> {
    const n = await this.asientosRepo.count({ where: { referencia_tipo, referencia_id } });
    return n > 0;
  }

  // ── Balance y Saldos ──────────────────────────────────────────────────────

  async getBalance(startDate?: string, endDate?: string): Promise<any> {
    const hasta = endDate ?? new Date().toISOString().split('T')[0];

    const saldos = await this.lineasRepo
      .createQueryBuilder('l')
      .innerJoin('l.asiento', 'a')
      .innerJoin('l.cuenta', 'c')
      .where('a.fecha <= :hasta', { hasta })
      .groupBy('c.id')
      .addGroupBy('c.codigo')
      .addGroupBy('c.nombre')
      .addGroupBy('c.tipo')
      .addGroupBy('c.acepta_movimientos')
      .select('c.id', 'id')
      .addSelect('c.codigo', 'codigo')
      .addSelect('c.nombre', 'nombre')
      .addSelect('c.tipo', 'tipo')
      .addSelect('SUM(l.debe)', 'total_debe')
      .addSelect('SUM(l.haber)', 'total_haber')
      .getRawMany();

    const porTipo: Record<string, any[]> = {
      Activo: [], Pasivo: [], Patrimonio: [], Ingreso: [], Gasto: [],
    };

    for (const s of saldos) {
      const debe  = Number(s.total_debe  ?? 0);
      const haber = Number(s.total_haber ?? 0);
      // Activos y Gastos: saldo = debe - haber
      // Pasivos, Patrimonio, Ingresos: saldo = haber - debe
      const saldo = ['Activo', 'Gasto'].includes(s.tipo)
        ? debe - haber
        : haber - debe;
      porTipo[s.tipo]?.push({ ...s, saldo, total_debe: debe, total_haber: haber });
    }

    const totalActivos    = porTipo.Activo.reduce((s, c) => s + c.saldo, 0);
    const totalPasivos    = porTipo.Pasivo.reduce((s, c) => s + c.saldo, 0);
    const totalPatrimonio = porTipo.Patrimonio.reduce((s, c) => s + c.saldo, 0);
    const totalIngresos   = porTipo.Ingreso.reduce((s, c) => s + c.saldo, 0);
    const totalGastos     = porTipo.Gasto.reduce((s, c) => s + c.saldo, 0);
    const utilidad        = totalIngresos - totalGastos;

    return {
      cuentas: porTipo,
      totales: { totalActivos, totalPasivos, totalPatrimonio, totalIngresos, totalGastos, utilidad },
      equilibrado: Math.abs(totalActivos - (totalPasivos + totalPatrimonio + utilidad)) < 1,
    };
  }

  // ── Cierre Diario ─────────────────────────────────────────────────────────

  async getCierres(limit = 30): Promise<CierreDiario[]> {
    return this.cierresRepo.find({
      relations: ['cerrado_por'],
      order: { fecha: 'DESC' },
      take: limit,
    });
  }

  async generarCierre(user: User, fecha?: string, notas?: string): Promise<CierreDiario> {
    const dia = fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

    const existente = await this.cierresRepo.findOneBy({ fecha: dia });
    if (existente?.cerrado) {
      throw new BadRequestException(`El día ${dia} ya fue cerrado.`);
    }

    // Sumar movimientos del día por tipo de cuenta
    const movs = await this.lineasRepo
      .createQueryBuilder('l')
      .innerJoin('l.asiento', 'a')
      .innerJoin('l.cuenta', 'c')
      .where('a.fecha = :dia', { dia })
      .andWhere("a.tipo != 'Cierre'")
      .select('c.tipo', 'tipo')
      .addSelect('a.tipo', 'tipo_asiento')
      .addSelect('SUM(l.debe)',  'debe')
      .addSelect('SUM(l.haber)', 'haber')
      .groupBy('c.tipo')
      .addGroupBy('a.tipo')
      .getRawMany();

    let ventasVehiculos = 0, ventasProductos = 0, totalIngresos = 0, totalGastos = 0;
    for (const m of movs) {
      const haber = Number(m.haber ?? 0);
      const debe  = Number(m.debe  ?? 0);
      if (m.tipo === 'Ingreso') {
        totalIngresos += haber - debe;
        if (m.tipo_asiento === 'Venta_Vehiculo') ventasVehiculos += haber - debe;
        if (m.tipo_asiento === 'Venta_Producto') ventasProductos += haber - debe;
      }
      if (m.tipo === 'Gasto') totalGastos += debe - haber;
    }

    const numTransacciones = await this.asientosRepo.count({ where: { fecha: dia as any } });

    const cierre = existente ?? this.cierresRepo.create({ fecha: dia });
    cierre.total_ingresos   = totalIngresos;
    cierre.total_gastos     = totalGastos;
    cierre.utilidad_neta    = totalIngresos - totalGastos;
    cierre.ventas_vehiculos = ventasVehiculos;
    cierre.ventas_productos = ventasProductos;
    cierre.num_transacciones = numTransacciones;
    cierre.notas            = notas ?? cierre.notas;
    cierre.cerrado          = true;
    cierre.cerrado_por      = user;

    return this.cierresRepo.save(cierre);
  }

  async resumenPeriodo(startDate: string, endDate: string): Promise<any> {
    const asientos = await this.asientosRepo.find({
      where: { fecha: Between(startDate as any, endDate as any) },
      relations: ['lineas', 'lineas.cuenta'],
    });
    let ingresos = 0, gastos = 0, ventasVeh = 0, ventasProd = 0;
    const gastosPorTipo: Record<string, number> = {};
    for (const a of asientos) {
      if (a.tipo === 'Cierre') continue; // los asientos de cierre no cuentan en el P&L
      for (const l of a.lineas) {
        if (l.cuenta.tipo === 'Ingreso') {
          const val = Number(l.haber) - Number(l.debe);
          ingresos += val;
          if (a.tipo === 'Venta_Vehiculo') ventasVeh  += val;
          if (a.tipo === 'Venta_Producto') ventasProd += val;
        }
        if (l.cuenta.tipo === 'Gasto') {
          const val = Number(l.debe) - Number(l.haber);
          gastos += val;
          gastosPorTipo[l.cuenta.nombre] = (gastosPorTipo[l.cuenta.nombre] ?? 0) + val;
        }
      }
    }
    return {
      startDate, endDate,
      num_asientos: asientos.length,
      ingresos, gastos,
      utilidad: ingresos - gastos,
      ventas_vehiculos: ventasVeh,
      ventas_productos: ventasProd,
      gastos_por_tipo: gastosPorTipo,
    };
  }

  async previewCierre(fecha?: string): Promise<any> {
    const dia = fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const asientos = await this.asientosRepo.find({
      where: { fecha: dia as any },
      relations: ['lineas', 'lineas.cuenta'],
    });

    let ingresos = 0, gastos = 0, ventasVeh = 0, ventasProd = 0;
    for (const a of asientos) {
      if (a.tipo === 'Cierre') continue;
      for (const l of a.lineas) {
        if (l.cuenta.tipo === 'Ingreso') {
          ingresos += Number(l.haber) - Number(l.debe);
          if (a.tipo === 'Venta_Vehiculo') ventasVeh  += Number(l.haber) - Number(l.debe);
          if (a.tipo === 'Venta_Producto') ventasProd += Number(l.haber) - Number(l.debe);
        }
        if (l.cuenta.tipo === 'Gasto') gastos += Number(l.debe) - Number(l.haber);
      }
    }

    return {
      fecha: dia,
      num_asientos: asientos.length,
      ingresos,
      gastos,
      utilidad: ingresos - gastos,
      ventas_vehiculos: ventasVeh,
      ventas_productos: ventasProd,
      ya_cerrado: (await this.cierresRepo.findOneBy({ fecha: dia as any }))?.cerrado ?? false,
    };
  }

  // ── Cierre de período con bloqueo (mensual/anual) ─────────────────────────

  async listarCierresPeriodo(): Promise<CierrePeriodo[]> {
    return this.cierrePeriodosRepo.find({ relations: ['cerrado_por'], order: { periodo: 'DESC' } });
  }

  async reabrirPeriodo(periodo: string): Promise<CierrePeriodo> {
    const c = await this.cierrePeriodosRepo.findOneBy({ periodo });
    if (!c) throw new NotFoundException(`No hay cierre para el período ${periodo}.`);
    c.cerrado = false;
    return this.cierrePeriodosRepo.save(c);
  }

  /**
   * Cierra un período contable: postea el asiento de cierre que salda las cuentas de
   * resultado (Ingresos/Gastos → 3300) para el mes, o traslada 3300 → 3200 en el año,
   * y bloquea la fecha para nuevos asientos.
   */
  async cerrarPeriodo(user: User, periodo: string, tipo: TipoCierre = 'Mensual'): Promise<CierrePeriodo> {
    const existente = await this.cierrePeriodosRepo.findOneBy({ periodo });
    if (existente?.cerrado) throw new BadRequestException(`El período ${periodo} ya está cerrado.`);

    const resultado = await this.asegurarCuenta('3300', { nombre: 'Utilidad / Pérdida del Período', tipo: 'Patrimonio' });
    let asientoId: number | null = null;
    let totalIngresos = 0, totalGastos = 0, utilidad = 0, fechaCierre: string;

    if (tipo === 'Mensual') {
      if (!/^\d{4}-\d{2}$/.test(periodo)) throw new BadRequestException("Período mensual debe ser 'YYYY-MM'.");
      const [y, m] = periodo.split('-').map(Number);
      const primer = `${periodo}-01`;
      const ultimo = new Date(y, m, 0).toLocaleDateString('en-CA'); // último día del mes
      fechaCierre = ultimo;

      const rows = await this.lineasRepo
        .createQueryBuilder('l')
        .innerJoin('l.asiento', 'a')
        .innerJoin('l.cuenta', 'c')
        .where('a.fecha BETWEEN :p AND :u', { p: primer, u: ultimo })
        .andWhere("a.tipo != 'Cierre'")
        .andWhere('c.tipo IN (:...tipos)', { tipos: ['Ingreso', 'Gasto'] })
        .groupBy('c.id').addGroupBy('c.tipo')
        .select('c.id', 'id').addSelect('c.tipo', 'tipo')
        .addSelect('SUM(l.debe)', 'debe').addSelect('SUM(l.haber)', 'haber')
        .getRawMany();

      const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [];
      for (const r of rows) {
        const debe = Number(r.debe) || 0, haber = Number(r.haber) || 0;
        if (r.tipo === 'Ingreso') {
          const saldo = +(haber - debe).toFixed(2);
          if (Math.abs(saldo) < 0.01) continue;
          totalIngresos += saldo;
          lineas.push({ cuentaId: Number(r.id), debe: saldo, haber: 0, descripcion: `Cierre ingresos ${periodo}` });
        } else {
          const saldo = +(debe - haber).toFixed(2);
          if (Math.abs(saldo) < 0.01) continue;
          totalGastos += saldo;
          lineas.push({ cuentaId: Number(r.id), debe: 0, haber: saldo, descripcion: `Cierre gastos ${periodo}` });
        }
      }
      utilidad = +(totalIngresos - totalGastos).toFixed(2);
      if (Math.abs(utilidad) >= 0.01) {
        if (utilidad > 0) lineas.push({ cuentaId: resultado.id, debe: 0, haber: utilidad, descripcion: `Utilidad del período ${periodo}` });
        else lineas.push({ cuentaId: resultado.id, debe: -utilidad, haber: 0, descripcion: `Pérdida del período ${periodo}` });
      }

      if (lineas.length) {
        const asiento = await this.crearAsiento(user, {
          fecha: ultimo, descripcion: `Cierre mensual ${periodo}`,
          tipo: 'Cierre', referencia_tipo: 'CierrePeriodo', lineas,
        }, { forzar: true });
        asientoId = asiento.id;
      }
    } else {
      // Anual: mover el saldo acumulado de 3300 a 3200 Utilidades Retenidas
      if (!/^\d{4}$/.test(periodo)) throw new BadRequestException("Período anual debe ser 'YYYY'.");
      const ultimo = `${periodo}-12-31`;
      fechaCierre = ultimo;
      const retenidas = await this.asegurarCuenta('3200', { nombre: 'Utilidades Retenidas', tipo: 'Patrimonio' });
      const saldoRow = await this.lineasRepo
        .createQueryBuilder('l')
        .innerJoin('l.asiento', 'a')
        .where('l.cuentaId = :cid', { cid: resultado.id })
        .andWhere('a.fecha <= :u', { u: ultimo })
        .select('SUM(l.debe)', 'debe').addSelect('SUM(l.haber)', 'haber')
        .getRawOne();
      const saldo = +(((Number(saldoRow?.haber) || 0) - (Number(saldoRow?.debe) || 0))).toFixed(2);
      utilidad = saldo;
      if (Math.abs(saldo) >= 0.01) {
        const lineas = saldo > 0
          ? [{ cuentaId: resultado.id, debe: saldo, haber: 0, descripcion: `Cierre anual ${periodo}` },
             { cuentaId: retenidas.id, debe: 0, haber: saldo, descripcion: `Traslado a utilidades retenidas ${periodo}` }]
          : [{ cuentaId: resultado.id, debe: 0, haber: -saldo, descripcion: `Cierre anual ${periodo}` },
             { cuentaId: retenidas.id, debe: -saldo, haber: 0, descripcion: `Traslado (pérdida) a utilidades retenidas ${periodo}` }];
        const asiento = await this.crearAsiento(user, {
          fecha: ultimo, descripcion: `Cierre anual ${periodo} — traslado a Utilidades Retenidas`,
          tipo: 'Cierre', referencia_tipo: 'CierrePeriodo', lineas,
        }, { forzar: true });
        asientoId = asiento.id;
      }
    }

    const cierre = existente ?? this.cierrePeriodosRepo.create({ periodo });
    cierre.tipo = tipo;
    cierre.cerrado = true;
    cierre.total_ingresos = totalIngresos;
    cierre.total_gastos = totalGastos;
    cierre.utilidad_neta = utilidad;
    cierre.asiento_cierre_id = asientoId;
    cierre.fecha_cierre = fechaCierre;
    cierre.cerrado_por = user;
    return this.cierrePeriodosRepo.save(cierre);
  }
}
