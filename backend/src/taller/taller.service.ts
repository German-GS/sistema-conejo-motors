import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenTrabajo } from './orden-trabajo.entity';
import { DetalleTaller } from './detalle-taller.entity';

@Injectable()
export class TallerService {
  constructor(
    @InjectRepository(OrdenTrabajo) private repo: Repository<OrdenTrabajo>,
    @InjectRepository(DetalleTaller) private detalleRepo: Repository<DetalleTaller>,
  ) {}

  findAll(): Promise<OrdenTrabajo[]> {
    return this.repo.find({ relations: ['cliente', 'vehiculo', 'tecnico'], order: { creado_en: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id }, relations: ['cliente', 'vehiculo', 'tecnico', 'detalles'] });
  }

  async create(data: any) {
    const count = await this.repo.count();
    const numero = `OT-${String(count + 1).padStart(6, '0')}`;
    const { detalles, ...rest } = data;
    const ot = this.repo.create({ ...rest, numero });
    const saved = await this.repo.save(ot)  as unknown as OrdenTrabajo;
    if (detalles?.length) {
      for (const d of detalles) {
        await this.detalleRepo.save(this.detalleRepo.create({ ...d, orden: { id: saved.id } as any }));
      }
    }
    return this.findOne(saved.id);
  }

  async update(id: number, data: any) {
    const { detalles: _d, ...rest } = data;
    await this.repo.update(id, rest);
    if (rest.estado === 'Entregado' && !rest.fecha_entrega_real) {
      await this.repo.update(id, { fecha_entrega_real: new Date().toISOString().split('T')[0] });
    }
    return this.findOne(id);
  }

  async addDetalle(ordenId: number, data: Partial<DetalleTaller>) {
    const d = this.detalleRepo.create({ ...data, orden: { id: ordenId } as any });
    await this.detalleRepo.save(d);
    const ot = await this.findOne(ordenId);
    if (ot) {
      const totalRep = ot.detalles.filter((x: any) => x.tipo === 'Repuesto').reduce((a: number, x: any) => a + +x.total, 0);
      const totalMO = ot.detalles.filter((x: any) => x.tipo !== 'Repuesto').reduce((a: number, x: any) => a + +x.total, 0);
      await this.repo.update(ordenId, { total_repuestos: totalRep, total_mano_obra: totalMO, total: totalRep + totalMO });
    }
    return this.findOne(ordenId);
  }

  async removeDetalle(id: number): Promise<void> { await this.detalleRepo.delete(id); }
}
