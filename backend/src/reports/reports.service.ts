// backend/src/reports/reports.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Venta } from '../ventas/venta.entity';
import { Between, Repository, LessThan, In } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ReciboPago } from '../recibos_pago/recibo_pago.entity';
import { Lead } from '../leads/lead.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { CierreMes } from './cierre-mes.entity';
import { User } from '../users/user.entity';
import * as XLSX from 'xlsx';

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ReciboPago)
    private recibosRepository: Repository<ReciboPago>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(CierreMes)
    private cierreMesRepository: Repository<CierreMes>,
  ) {}

  // ── Cierre de Mes ──────────────────────────────────────────────────────────

  /** Genera un preview del snapshot del mes para mostrar antes de confirmar */
  async getCierrePreview(mes: number, anio: number) {
    const { inicio, fin } = this.rangoDeMes(mes, anio);
    const snapshot = await this.buildSnapshot(mes, anio, inicio, fin);
    const yaExiste = await this.cierreMesRepository.findOne({ where: { mes, anio } });
    return { snapshot, yaExiste: !!yaExiste };
  }

  /** Ejecuta el cierre: guarda snapshot y archiva leads/cotizaciones vencidas */
  async ejecutarCierre(
    mes: number,
    anio: number,
    user: User,
    archivarLeads: boolean,
  ): Promise<CierreMes> {
    const yaExiste = await this.cierreMesRepository.findOne({ where: { mes, anio } });
    if (yaExiste) {
      throw new BadRequestException(`El mes ${MESES[mes]} ${anio} ya fue cerrado.`);
    }

    const { inicio, fin } = this.rangoDeMes(mes, anio);
    const snapshot = await this.buildSnapshot(mes, anio, inicio, fin);

    // Archivar leads sin actividad del mes cerrado
    if (archivarLeads) {
      await this.leadsRepository
        .createQueryBuilder()
        .update(Lead)
        .set({ estado: 'Perdido' })
        .where('estado NOT IN (:...excluir)', { excluir: ['Cerrado', 'Perdido'] })
        .andWhere('fecha_creacion <= :fin', { fin })
        .execute();

      // Marcar cotizaciones activas vencidas del mes como Canceladas
      await this.cotizacionesRepository
        .createQueryBuilder()
        .update(Cotizacion)
        .set({ estado: 'Cancelada', motivo_cancelacion: `Archivado en cierre de mes ${MESES[mes]} ${anio}` })
        .where('estado IN (:...estados)', { estados: ['Borrador', 'Enviada'] })
        .andWhere('fecha_expiracion < :hoy', { hoy: new Date() })
        .execute();
    }

    const cierre = this.cierreMesRepository.create({ mes, anio, cerrado_por: user, snapshot });
    return this.cierreMesRepository.save(cierre);
  }

  /** Lista todos los cierres de mes */
  async getCierres(): Promise<CierreMes[]> {
    return this.cierreMesRepository.find({
      relations: ['cerrado_por'],
      order: { anio: 'DESC', mes: 'DESC' },
    });
  }

  /** Genera Excel para un cierre específico */
  async generarExcelCierre(id: number): Promise<Buffer> {
    const cierre = await this.cierreMesRepository.findOne({
      where: { id },
      relations: ['cerrado_por'],
    });
    if (!cierre) throw new BadRequestException('Cierre no encontrado');

    const wb = XLSX.utils.book_new();
    const s = cierre.snapshot;
    const titulo = `${MESES[cierre.mes]} ${cierre.anio}`;

    // Hoja 1: Resumen
    const resumen = [
      ['INFORME DE CIERRE DE MES — ' + titulo],
      [],
      ['VENTAS'],
      ['Vehículos vendidos', s.ventas?.cantidad ?? 0],
      ['Ingresos totales', s.ventas?.ingresos ?? 0],
      ['Ganancia bruta', s.ventas?.ganancia ?? 0],
      [],
      ['LEADS'],
      ['Nuevos este mes', s.leads?.nuevos ?? 0],
      ['Cerrados (ventas)', s.leads?.cerrados ?? 0],
      ['Perdidos', s.leads?.perdidos ?? 0],
      ['Activos al cierre', s.leads?.activos ?? 0],
      [],
      ['COTIZACIONES'],
      ['Emitidas este mes', s.cotizaciones?.emitidas ?? 0],
      ['Aceptadas', s.cotizaciones?.aceptadas ?? 0],
      ['Vencidas/Canceladas', s.cotizaciones?.vencidas ?? 0],
      [],
      ['INVENTARIO'],
      ['Disponibles al cierre', s.inventario?.disponibles ?? 0],
      ['Reservados', s.inventario?.reservados ?? 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumen);
    ws1['!cols'] = [{ wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

    // Hoja 2: Top vendedores
    if (s.topVendedores?.length) {
      const rows = [['Vendedor', 'Ventas', 'Ingresos (CRC)'],
        ...s.topVendedores.map((v: any) => [v.vendedor || 'Sin asignar', v.unidadesvendidas, v.totalvendido])];
      const ws2 = XLSX.utils.aoa_to_sheet(rows);
      ws2['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Vendedores');
    }

    // Hoja 3: Leads perdidos del mes (para análisis de pérdidas)
    if (s.leadsPerdidos?.length) {
      const rows = [
        ['ID', 'Cliente', 'Fuente', 'Vendedor', 'Vehículo de interés', 'Fecha creación'],
        ...s.leadsPerdidos.map((l: any) => [
          l.id, l.nombre_cliente, l.fuente,
          l.vendedor || 'Sin asignar',
          l.vehiculo || '—',
          l.fecha_creacion,
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(rows);
      ws3['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Leads Perdidos');
    }

    // Hoja 4: Detalle ventas
    if (s.detalleVentas?.length) {
      const rows = [
        ['Fecha', 'Vehículo', 'Cliente', 'Vendedor', 'Monto (CRC)'],
        ...s.detalleVentas.map((v: any) => [
          v.fecha_venta, v.vehiculo, v.cliente, v.vendedor, v.monto,
        ]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(rows);
      ws4['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Ventas');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ── helpers privados ───────────────────────────────────────────────────────

  private rangoDeMes(mes: number, anio: number) {
    const inicio = new Date(anio, mes - 1, 1, 0, 0, 0);
    const fin    = new Date(anio, mes, 0, 23, 59, 59);
    return { inicio, fin };
  }

  private async buildSnapshot(mes: number, anio: number, inicio: Date, fin: Date) {
    const hoy = new Date();

    // Ventas del mes
    const ventas = await this.ventasRepository.find({
      where: { fecha_venta: Between(inicio, fin) },
      relations: ['vendedor', 'cotizacion.vehiculo', 'cotizacion.cliente'],
    });
    const ingresosVentas = ventas.reduce((s, v) => s + Number(v.monto_final || 0), 0);
    const costoVentas = ventas.reduce((s, v) => s + Number(v.cotizacion?.vehiculo?.precio_costo || 0), 0);

    // Top vendedores del mes
    const topVendedores = await this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.vendedor', 'vendedor')
      .select('vendedor.nombre_completo', 'vendedor')
      .addSelect('COUNT(venta.id)', 'unidadesvendidas')
      .addSelect('SUM(venta.monto_final)', 'totalvendido')
      .where({ fecha_venta: Between(inicio, fin) })
      .groupBy('vendedor.nombre_completo')
      .orderBy('SUM(venta.monto_final)', 'DESC')
      .getRawMany();

    // Leads
    const leadsNuevos  = await this.leadsRepository.count({ where: { fecha_creacion: Between(inicio, fin) } });
    const leadsCerrados = await this.leadsRepository.count({ where: { estado: 'Cerrado', fecha_creacion: Between(inicio, fin) } });
    const leadsPerdidosMes = await this.leadsRepository.count({ where: { estado: 'Perdido', fecha_creacion: Between(inicio, fin) } });
    const leadsActivos  = await this.leadsRepository.count({ where: { estado: In(['Nuevo', 'Contactado', 'En Progreso', 'Prueba de Manejo', 'Cotizacion Enviada', 'Negociacion']) } });

    // Leads perdidos con detalle (para análisis)
    const leadsPerdidosDetalle = await this.leadsRepository.find({
      where: { estado: 'Perdido', fecha_creacion: Between(inicio, fin) },
      relations: ['vendedor_asignado', 'vehiculo_interes'],
      order: { fecha_creacion: 'ASC' },
    });

    // Cotizaciones
    const cotizEmitidas  = await this.cotizacionesRepository.count({ where: { fecha_creacion: Between(inicio, fin) } });
    const cotizAceptadas = await this.cotizacionesRepository.count({ where: { estado: In(['Aceptada', 'Facturada']), fecha_creacion: Between(inicio, fin) } });
    const cotizVencidas  = await this.cotizacionesRepository.count({ where: { estado: In(['Borrador', 'Enviada']), fecha_expiracion: LessThan(hoy) } });

    // Inventario al cierre
    const invDisponibles = await this.vehicleRepository.count({ where: { estado: 'Disponible' } });
    const invReservados  = await this.vehicleRepository.count({ where: { estado: 'Reservado' } });

    return {
      mes,
      anio,
      nombreMes: MESES[mes],
      ventas: {
        cantidad: ventas.length,
        ingresos: ingresosVentas,
        ganancia: ingresosVentas - costoVentas,
      },
      topVendedores,
      leads: {
        nuevos: leadsNuevos,
        cerrados: leadsCerrados,
        perdidos: leadsPerdidosMes,
        activos: leadsActivos,
      },
      leadsPerdidos: leadsPerdidosDetalle.map(l => ({
        id: l.id,
        nombre_cliente: l.nombre_cliente,
        fuente: l.fuente,
        vendedor: l.vendedor_asignado?.nombre_completo ?? 'Sin asignar',
        vehiculo: l.vehiculo_interes
          ? `${l.vehiculo_interes.marca} ${l.vehiculo_interes.modelo} (${l.vehiculo_interes.año})`
          : '—',
        fecha_creacion: new Date(l.fecha_creacion).toLocaleDateString('es-CR'),
      })),
      cotizaciones: {
        emitidas: cotizEmitidas,
        aceptadas: cotizAceptadas,
        vencidas: cotizVencidas,
      },
      inventario: {
        disponibles: invDisponibles,
        reservados: invReservados,
      },
      detalleVentas: ventas.map(v => ({
        fecha_venta: new Date(v.fecha_venta).toLocaleDateString('es-CR'),
        vehiculo: v.cotizacion?.vehiculo
          ? `${v.cotizacion.vehiculo.marca} ${v.cotizacion.vehiculo.modelo} (${v.cotizacion.vehiculo.año})`
          : v.cotizacion?.vehiculo_descripcion ?? '—',
        cliente: v.cotizacion?.cliente?.nombre_completo ?? '—',
        vendedor: v.vendedor?.nombre_completo ?? 'Sin asignar',
        monto: Number(v.monto_final || 0),
      })),
    };
  }

  // ── Informes existentes ────────────────────────────────────────────────────

  async getSalesBySellerReport(startDate: Date, endDate: Date) {
    return this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.vendedor', 'vendedor')
      .select('vendedor.nombre_completo', 'vendedor')
      .addSelect('COUNT(venta.id)', 'unidadesvendidas')
      .addSelect('SUM(venta.monto_final)', 'totalvendido')
      .where({ fecha_venta: Between(startDate, endDate) })
      .groupBy('vendedor.nombre_completo')
      .orderBy('SUM(venta.monto_final)', 'DESC')
      .getRawMany();
  }

  async getPayrollReport(startDate: Date, endDate: Date) {
    const recibos = await this.recibosRepository.find({
      where: { periodo_fin: Between(startDate, endDate) },
      relations: ['usuario'],
    });
    return recibos.map((recibo) => ({
      nombre_completo: recibo.usuario.nombre_completo,
      cedula: recibo.usuario.cedula,
      banco: recibo.usuario.banco,
      numero_cuenta: recibo.usuario.numero_cuenta,
      monto_deposito: recibo.salario_neto,
    }));
  }

  async getSalesByVehicleReport(startDate: Date, endDate: Date) {
    return this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.cotizacion', 'cotizacion')
      .leftJoin('cotizacion.vehiculo', 'vehiculo')
      .select("vehiculo.marca || ' ' || vehiculo.modelo", 'vehiculo')
      .addSelect('COUNT(venta.id)', 'unidadesvendidas')
      .addSelect('SUM(venta.monto_final)', 'totalvendido')
      .where({ fecha_venta: Between(startDate, endDate) })
      .groupBy('vehiculo')
      .orderBy('COUNT(venta.id)', 'DESC')
      .getRawMany();
  }

  async getProfitReport(startDate: Date, endDate: Date) {
    const query = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.cotizacion', 'cotizacion')
      .leftJoinAndSelect('cotizacion.vehiculo', 'vehiculo')
      .select('SUM(venta.monto_final)', 'totalVentas')
      .addSelect('SUM(vehiculo.precio_costo)', 'totalCosto')
      .where({ fecha_venta: Between(startDate, endDate) });
    const result = await query.getRawOne();
    const totalVentas = Number(result?.totalVentas) || 0;
    const totalCosto  = Number(result?.totalCosto) || 0;
    return { totalVentas, totalCosto, gananciaBruta: totalVentas - totalCosto };
  }

  async getDetailedSalesReport(startDate: Date, endDate: Date) {
    return this.ventasRepository.find({
      where: { fecha_venta: Between(startDate, endDate) },
      relations: ['vendedor', 'cotizacion.cliente', 'cotizacion.vehiculo'],
      order: { fecha_venta: 'ASC' },
    });
  }

  async getLeadsBySellerReport(startDate: Date, endDate: Date) {
    return this.leadsRepository
      .createQueryBuilder('lead')
      .leftJoin('lead.vendedor_asignado', 'vendedor')
      .select('vendedor.nombre_completo', 'vendedor')
      .addSelect('COUNT(lead.id)', 'total')
      .addSelect("SUM(CASE WHEN lead.estado = 'Cerrado' THEN 1 ELSE 0 END)", 'cerrados')
      .addSelect("SUM(CASE WHEN lead.estado = 'Perdido' THEN 1 ELSE 0 END)", 'perdidos')
      .addSelect("SUM(CASE WHEN lead.estado NOT IN ('Cerrado','Perdido') THEN 1 ELSE 0 END)", 'activos')
      .where('lead.fecha_creacion BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('vendedor.nombre_completo')
      .orderBy('COUNT(lead.id)', 'DESC')
      .getRawMany();
  }

  async getMostQuotedReport(startDate: Date, endDate: Date) {
    return this.cotizacionesRepository
      .createQueryBuilder('cot')
      .leftJoin('cot.vehiculo', 'vehiculo')
      .select("vehiculo.marca || ' ' || vehiculo.modelo || ' (' || vehiculo.año || ')'", 'vehiculo')
      .addSelect('COUNT(cot.id)', 'cotizaciones')
      .addSelect('SUM(cot.precio_final)', 'monto_total')
      .where('cot.fecha_creacion BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('vehiculo.id IS NOT NULL')
      .groupBy('vehiculo.marca, vehiculo.modelo, vehiculo.año')
      .orderBy('COUNT(cot.id)', 'DESC')
      .limit(20)
      .getRawMany();
  }

  async getInventoryReport() {
    const vehicles = await this.vehicleRepository.find({
      where: { estado: 'Disponible' },
      relations: ['bodega'],
    });
    return {
      vehicles,
      totalVehicles: vehicles.length,
      inventoryCost: vehicles.reduce((sum, v) => sum + Number(v.precio_costo), 0),
    };
  }
}
