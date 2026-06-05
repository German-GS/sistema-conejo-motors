import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(@InjectRepository(Proveedor) private repo: Repository<Proveedor>) {}

  findAll(): Promise<Proveedor[]> { return this.repo.find({ order: { nombre: 'ASC' } }); }
  findOne(id: number): Promise<any> { return this.repo.findOne({ where: { id } }); }
  async create(data: Partial<Proveedor>): Promise<any> { return this.repo.save(this.repo.create(data)); }
  async update(id: number, data: Partial<Proveedor>): Promise<any> {
    await this.repo.update(id, data); return this.findOne(id);
  }
  async remove(id: number): Promise<any> { await this.repo.update(id, { activo: false }); }
}
