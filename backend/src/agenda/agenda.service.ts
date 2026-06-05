import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cita } from './cita.entity';

@Injectable()
export class AgendaService {
  constructor(@InjectRepository(Cita) private repo: Repository<Cita>) {}

  async findAll(userId?: number, desde?: string, hasta?: string): Promise<Cita[]> {
    const where: any = {};
    if (userId) where.asignado_a = { id: userId };
    if (desde && hasta) {
      where.fecha_hora = Between(new Date(desde), new Date(hasta + 'T23:59:59'));
    } else if (desde) {
      where.fecha_hora = MoreThanOrEqual(new Date(desde));
    }
    return this.repo.find({ where, relations: ['asignado_a', 'lead', 'cliente'], order: { fecha_hora: 'ASC' } });
  }

  async findProximas(userId: number): Promise<Cita[]> {
    const now = new Date();
    const limite = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return this.repo.find({
      where: { asignado_a: { id: userId }, estado: 'Pendiente', fecha_hora: Between(now, limite) },
      relations: ['lead', 'cliente'],
      order: { fecha_hora: 'ASC' },
    });
  }

  async create(data: Partial<Cita>): Promise<Cita> {
    const cita = this.repo.create(data);
    return this.repo.save(cita);
  }

  async update(id: number, data: Partial<Cita>): Promise<Cita> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id }, relations: ["asignado_a", "lead", "cliente"] }) as Promise<Cita>;
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async getPendientesHoy(userId?: number): Promise<number> {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    const where: any = { estado: 'Pendiente', fecha_hora: Between(inicio, fin) };
    if (userId) where.asignado_a = { id: userId };
    return this.repo.count({ where });
  }
}
