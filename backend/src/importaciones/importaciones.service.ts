import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Importacion } from './importacion.entity';
import { ImportacionVehiculo } from './importacion-vehiculo.entity';

@Injectable()
export class ImportacionesService {
  constructor(
    @InjectRepository(Importacion) private repo: Repository<Importacion>,
    @InjectRepository(ImportacionVehiculo) private vehiculoRepo: Repository<ImportacionVehiculo>,
  ) {}

  findAll(): Promise<Importacion[]> {
    return this.repo.find({ relations: ['responsable', 'vehiculos', 'vehiculos.vehiculo'], order: { creado_en: 'DESC' } });
  }

  findOne(id: number): Promise<any> {
    return this.repo.findOne({ where: { id }, relations: ['responsable', 'vehiculos', 'vehiculos.vehiculo'] });
  }

  async create(data: Partial<Importacion>): Promise<any> {
    const imp = this.repo.create(data);
    return this.repo.save(imp);
  }

  async update(id: number, data: Partial<Importacion>): Promise<any> {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async addVehiculo(importacionId: number, data: Partial<ImportacionVehiculo>): Promise<any> {
    const v = this.vehiculoRepo.create({ ...data, importacion: { id: importacionId } as any });
    return this.vehiculoRepo.save(v);
  }

  async removeVehiculo(id: number): Promise<any> {
    await this.vehiculoRepo.delete(id);
  }
}
