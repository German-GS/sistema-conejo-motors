import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccesorioVehiculo } from './accesorio.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class AccesoriosService {
  constructor(
    @InjectRepository(AccesorioVehiculo)
    private accesoriosRepo: Repository<AccesorioVehiculo>,
    @InjectRepository(Vehicle)
    private vehiclesRepo: Repository<Vehicle>,
  ) {}

  async findAll(): Promise<AccesorioVehiculo[]> {
    return this.accesoriosRepo.find({
      relations: ['vehiculo', 'vehiculo.bodega'],
      order: { vehiculo: { id: 'ASC' } },
    });
  }

  async findByVehiculo(vehiculoId: number): Promise<AccesorioVehiculo> {
    const acc = await this.accesoriosRepo.findOne({
      where: { vehiculo: { id: vehiculoId } },
      relations: ['vehiculo'],
    });
    if (!acc) throw new NotFoundException(`Accesorios para vehículo #${vehiculoId} no encontrados`);
    return acc;
  }

  async upsert(vehiculoId: number, data: Partial<AccesorioVehiculo>): Promise<AccesorioVehiculo> {
    const vehiculo = await this.vehiclesRepo.findOneBy({ id: vehiculoId });
    if (!vehiculo) throw new NotFoundException(`Vehículo #${vehiculoId} no encontrado`);

    let acc = await this.accesoriosRepo.findOne({ where: { vehiculo: { id: vehiculoId } } });
    if (!acc) {
      acc = this.accesoriosRepo.create({ vehiculo, ...data });
    } else {
      Object.assign(acc, data);
    }
    return this.accesoriosRepo.save(acc);
  }
}
