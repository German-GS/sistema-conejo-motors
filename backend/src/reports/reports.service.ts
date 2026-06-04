import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Venta } from '../ventas/venta.entity';
import { Between, Repository } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ReciboPago } from '../recibos_pago/recibo_pago.entity';
import { Lead } from '../leads/lead.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';

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
  ) {}

  // ... (otros métodos sin cambios) ...

  // Informe de Ventas por Vendedor
  async getSalesBySellerReport(startDate: Date, endDate: Date) {
    return (
      this.ventasRepository
        .createQueryBuilder('venta')
        .leftJoin('venta.vendedor', 'vendedor')
        .select('vendedor.nombre_completo', 'vendedor')
        // --- 👇 CORRECCIÓN AQUÍ: Alias en minúsculas 👇 ---
        .addSelect('COUNT(venta.id)', 'unidadesvendidas')
        .addSelect('SUM(venta.monto_final)', 'totalvendido')
        .where({ fecha_venta: Between(startDate, endDate) })
        .groupBy('vendedor.nombre_completo')
        .orderBy('SUM(venta.monto_final)', 'DESC')
        .getRawMany()
    );
  }
  async getPayrollReport(startDate: Date, endDate: Date) {
   

    const recibos = await this.recibosRepository.find({
      // --- 👇 INICIO DE LA CORRECCIÓN 👇 ---
      where: {
        // Cambiamos 'fecha_pago' por 'periodo_fin' para que coincida
        // con las expectativas del usuario al buscar por un rango.
        periodo_fin: Between(startDate, endDate),
      },
      // --- 👆 FIN DE LA CORRECCIÓN 👆 ---
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

  // Informe de Ventas por Vehículo
  async getSalesByVehicleReport(startDate: Date, endDate: Date) {
    return (
      this.ventasRepository
        .createQueryBuilder('venta')
        .leftJoin('venta.cotizacion', 'cotizacion')
        .leftJoin('cotizacion.vehiculo', 'vehiculo')
        .select("vehiculo.marca || ' ' || vehiculo.modelo", 'vehiculo')
        // --- 👇 CORRECCIÓN AQUÍ: Alias en minúsculas 👇 ---
        .addSelect('COUNT(venta.id)', 'unidadesvendidas')
        .addSelect('SUM(venta.monto_final)', 'totalvendido')
        .where({ fecha_venta: Between(startDate, endDate) })
        .groupBy('vehiculo')
        .orderBy('COUNT(venta.id)', 'DESC')
        .getRawMany()
    );
  }

  // --- El resto de métodos se mantienen igual ---
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
    const totalCosto = Number(result?.totalCosto) || 0;
    const gananciaBruta = totalVentas - totalCosto;
    return { totalVentas, totalCosto, gananciaBruta };
  }
  async getDetailedSalesReport(startDate: Date, endDate: Date) {
    return this.ventasRepository.find({
      where: { fecha_venta: Between(startDate, endDate) },
      relations: ['vendedor', 'cotizacion.cliente', 'cotizacion.vehiculo'],
      order: { fecha_venta: 'ASC' },
    });
  }
  /** Leads por vendedor: conteo por estado */
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

  /** Vehículos más cotizados */
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
    const totalVehicles = vehicles.length;
    const inventoryCost = vehicles.reduce(
      (sum, v) => sum + Number(v.precio_costo),
      0,
    );
    return { vehicles, totalVehicles, inventoryCost };
  }
}
