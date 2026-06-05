import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { LineaCompra } from './linea-compra.entity';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(OrdenCompra) private repo: Repository<OrdenCompra>,
    @InjectRepository(LineaCompra) private lineaRepo: Repository<LineaCompra>,
  ) {}

  findAll(): Promise<OrdenCompra[]> {
    return this.repo.find({ relations: ['proveedor', 'creado_por', 'lineas'], order: { creado_en: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id }, relations: ['proveedor', 'creado_por', 'lineas'] });
  }

  async create(data: any, userId: number) {
    const count = await this.repo.count();
    const numero = `OC-${String(count + 1).padStart(6, '0')}`;
    const { lineas, ...rest } = data;
    const orden = this.repo.create({ ...rest, numero, creado_por: { id: userId } as any });
    const saved = await this.repo.save(orden)  as unknown as OrdenCompra;
    if (lineas?.length) {
      for (const l of lineas) {
        const linea = this.lineaRepo.create({ ...l, orden: { id: saved.id } as any });
        await this.lineaRepo.save(linea);
      }
    }
    return this.findOne(saved.id);
  }

  async update(id: number, data: Partial<OrdenCompra>) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }
}
