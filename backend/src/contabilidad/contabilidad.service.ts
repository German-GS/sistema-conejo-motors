import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CuentaContable } from './cuenta.entity';
import { AsientoContable, LineaAsiento, TipoAsiento } from './asiento.entity';
import { CierreDiario } from './cierre-diario.entity';
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
      { codigo: '1300', nombre: 'Inventario Vehículos', tipo: 'Activo', descripcion: 'Valor de vehículos en stock' },
      { codigo: '1400', nombre: 'Inventario Repuestos y Accesorios', tipo: 'Activo', descripcion: 'Valor de productos en stock' },
      { codigo: '1500', nombre: 'Activos Fijos', tipo: 'Activo', acepta_movimientos: false },
      { codigo: '1510', nombre: 'Mobiliario y Equipo', tipo: 'Activo' },
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
      { codigo: '5600', nombre: 'Gastos Financieros', tipo: 'Gasto' },
      { codigo: '5700', nombre: 'Otros Gastos', tipo: 'Gasto' },
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
  ): Promise<AsientoContable> {
    // Validar partida doble: suma debe = suma haber
    const sumaDebe  = body.lineas.reduce((s, l) => s + (l.debe  ?? 0), 0);
    const sumaHaber = body.lineas.reduce((s, l) => s + (l.haber ?? 0), 0);
    if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
      throw new BadRequestException(
        `El asiento no cuadra: Debe=${sumaDebe.toFixed(2)} ≠ Haber=${sumaHaber.toFixed(2)}`,
      );
    }

    const asiento = this.asientosRepo.create({
      fecha: body.fecha,
      descripcion: body.descripcion,
      tipo: body.tipo ?? 'Manual',
      referencia_id: body.referencia_id,
      referencia_tipo: body.referencia_tipo,
      creado_por: user,
    });
    const saved = await this.asientosRepo.save(asiento);

    for (const l of body.lineas) {
      const cuenta = await this.cuentasRepo.findOneBy({ id: l.cuentaId });
      if (!cuenta) throw new NotFoundException(`Cuenta #${l.cuentaId} no encontrada.`);
      const linea = this.lineasRepo.create({
        asiento: saved,
        cuenta,
        debe:  l.debe  ?? 0,
        haber: l.haber ?? 0,
        descripcion: l.descripcion,
      });
      await this.lineasRepo.save(linea);
    }

    return this.getAsiento(saved.id);
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

  async previewCierre(fecha?: string): Promise<any> {
    const dia = fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const asientos = await this.asientosRepo.find({
      where: { fecha: dia as any },
      relations: ['lineas', 'lineas.cuenta'],
    });

    let ingresos = 0, gastos = 0, ventasVeh = 0, ventasProd = 0;
    for (const a of asientos) {
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
}
