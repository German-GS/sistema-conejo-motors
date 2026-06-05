import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Gasto } from './gasto.entity';

@Injectable()
export class GastosService {
  constructor(@InjectRepository(Gasto) private repo: Repository<Gasto>) {}

  findAll(desde?: string, hasta?: string): Promise<Gasto[]> {
    const where: any = {};
    if (desde && hasta) where.fecha = Between(desde, hasta);
    return this.repo.find({ where, relations: ['proveedor', 'registrado_por'], order: { fecha: 'DESC' } });
  }

  async create(data: Partial<Gasto>, userId: number): Promise<any> {
    const g = this.repo.create({ ...data, registrado_por: { id: userId } as any });
    return this.repo.save(g);
  }

  async update(id: number, data: Partial<Gasto>): Promise<any> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id }, relations: ['proveedor'] });
  }

  async remove(id: number): Promise<any> { await this.repo.delete(id); }

  async resumenPorCategoria(año: number, mes: number): Promise<any[]> {
    const desde = `${año}-${String(mes).padStart(2,'0')}-01`;
    const hasta = `${año}-${String(mes).padStart(2,'0')}-31`;
    const gastos = await this.repo.find({ where: { fecha: Between(desde, hasta) } });
    const mapa: Record<string, number> = {};
    for (const g of gastos) {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + +g.monto;
    }
    return Object.entries(mapa).map(([categoria, total]) => ({ categoria, total }));
  }
}
