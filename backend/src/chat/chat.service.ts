import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ChatMensaje } from './chat.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMensaje)
    private repo: Repository<ChatMensaje>,
  ) {}

  /** Enviar mensaje al chat grupal */
  async enviar(user: User, contenido: string): Promise<ChatMensaje> {
    const msg = this.repo.create({ contenido: contenido.trim(), remitente: user });
    const saved = await this.repo.save(msg);
    // Recargar con relación
    return (await this.repo.findOne({ where: { id: saved.id }, relations: ['remitente', 'remitente.rol'] })) ?? saved;
  }

  /** Obtener últimos N mensajes */
  async recientes(limit = 50): Promise<ChatMensaje[]> {
    return this.repo.find({
      relations: ['remitente', 'remitente.rol'],
      order: { fecha_hora: 'DESC' },
      take: limit,
    }).then(msgs => msgs.reverse());
  }

  /** Mensajes nuevos desde un ID (para polling) */
  async desdeId(sinceId: number): Promise<ChatMensaje[]> {
    return this.repo.find({
      where: { id: MoreThan(sinceId) },
      relations: ['remitente', 'remitente.rol'],
      order: { fecha_hora: 'ASC' },
    });
  }
}
