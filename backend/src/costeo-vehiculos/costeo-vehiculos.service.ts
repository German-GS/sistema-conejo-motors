import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CosteoVehiculo } from './costeo-vehiculo.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class CosteoVehiculosService {
  private readonly logger = new Logger(CosteoVehiculosService.name);

  constructor(
    @InjectRepository(CosteoVehiculo) private repo: Repository<CosteoVehiculo>,
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
  ) {}

  async findByVehiculo(vehiculoId: number): Promise<CosteoVehiculo | null> {
    return this.repo.findOne({ where: { vehiculo: { id: vehiculoId } }, relations: ['vehiculo'] });
  }

  async upsert(vehiculoId: number, data: Partial<CosteoVehiculo>): Promise<any> {
    let costeo = await this.findByVehiculo(vehiculoId);
    if (!costeo) {
      costeo = this.repo.create({ ...data, vehiculo: { id: vehiculoId } as any });
    } else {
      Object.assign(costeo, data);
    }
    const saved = await this.repo.save(costeo);

    // El costeo es la fuente de verdad del costo: sincroniza precio_costo del vehículo
    const costoTotal = this.calcularCostoTotal(saved);
    await this.vehiclesRepo.update(vehiculoId, { precio_costo: costoTotal });
    this.logger.log(`Costeo veh #${vehiculoId}: precio_costo sincronizado a ₡${costoTotal}`);

    return { ...saved, costo_total: costoTotal };
  }

  calcularCostoTotal(c: CosteoVehiculo): number {
    return [c.valor_fob, c.flete, c.seguro, c.aranceles, c.impuesto_ventas,
      c.duca_gastos, c.transporte_local, c.inspeccion_rtv, c.preparacion,
      c.adaptaciones, c.otros].reduce((a, b) => +a + +b, 0);
  }

  async findAll(): Promise<any[]> {
    const all = await this.repo.find({ relations: ['vehiculo'] });
    return all.map(c => ({ ...c, costo_total: this.calcularCostoTotal(c) }));
  }
}
