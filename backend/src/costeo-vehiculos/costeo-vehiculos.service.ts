import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CosteoVehiculo } from './costeo-vehiculo.entity';

@Injectable()
export class CosteoVehiculosService {
  constructor(@InjectRepository(CosteoVehiculo) private repo: Repository<CosteoVehiculo>) {}

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
    return this.repo.save(costeo);
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
