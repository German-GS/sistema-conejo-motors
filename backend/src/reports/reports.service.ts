import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Venta } from '../ventas/venta.entity';
import { Between, Repository } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ReciboPago } from '../recibos_pago/recibo_pago.entity'; 

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ReciboPago)
    private recibosRepository: Repository<ReciboPago>,
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
  async getInventoryReport() {
    const vehicles = await this.vehicleRepository.find({
      where: { estado: 'Disponible' },
    });
    const totalVehicles = vehicles.length;
    const inventoryCost = vehicles.reduce(
      (sum, v) => sum + Number(v.precio_costo),
      0,
    );
    return { vehicles, totalVehicles, inventoryCost };
  }
}
