import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Garantia } from './garantia.entity';
import { ReclamoGarantia } from './reclamo-garantia.entity';

@Injectable()
export class GarantiasService {
  constructor(
    @InjectRepository(Garantia) private repo: Repository<Garantia>,
    @InjectRepository(ReclamoGarantia) private reclamoRepo: Repository<ReclamoGarantia>,
  ) {}

  async findAll(): Promise<Garantia[]> {
    const hoy = new Date().toISOString().split('T')[0];
    await this.repo.createQueryBuilder().update().set({ estado: 'Vencida' })
      .where('estado = :e AND fecha_fin < :hoy', { e: 'Activa', hoy }).execute();
    return this.repo.find({ relations: ['vehiculo', 'cliente', 'reclamos'], order: { fecha_fin: 'ASC' } });
  }

  findOne(id: number): Promise<any> {
    return this.repo.findOne({ where: { id }, relations: ['vehiculo', 'cliente', 'reclamos', 'reclamos.atendido_por'] });
  }

  async create(data: Partial<Garantia>): Promise<any> {
    const g = this.repo.create(data);
    return this.repo.save(g);
  }

  async update(id: number, data: Partial<Garantia>): Promise<any> {
    await this.repo.update(id, data); return this.findOne(id);
  }

  async addReclamo(garantiaId: number, data: Partial<ReclamoGarantia>): Promise<any> {
    const r = this.reclamoRepo.create({ ...data, garantia: { id: garantiaId } as any });
    return this.reclamoRepo.save(r);
  }

  async updateReclamo(id: number, data: Partial<ReclamoGarantia>): Promise<any> {
    await this.reclamoRepo.update(id, data);
    return this.reclamoRepo.findOne({ where: { id } });
  }
}
