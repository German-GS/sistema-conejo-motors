import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createForUser(
    user: User,
    message: string,
    link: string,
  ): Promise<void> {
    const notification = this.notificationsRepository.create({
      message,
      link,
      user,
    });
    await this.notificationsRepository.save(notification);
  }

  
  async createForAdmins(message: string, link: string): Promise<void> {
    await this.createForRoles(['Administrador'], message, link);
  }

  /** Envía notificación a todos los Admins y Contadores (sin contar cuenta sistema) */
  async createForAdminsAndContadores(message: string, link: string): Promise<void> {
    await this.createForRoles(['Administrador', 'Contador'], message, link);
  }

  /** Envía notificación a todos los usuarios de los roles indicados */
  async createForRoles(roles: string[], message: string, link: string): Promise<void> {
    const usuarios: User[] = [];
    for (const rolNombre of roles) {
      const found = await this.usersRepository.find({
        where: { rol: { nombre: rolNombre }, es_sistema: false },
        relations: ['rol'],
      });
      usuarios.push(...found);
    }
    if (!usuarios.length) return;

    const notifications = usuarios.map((u) =>
      this.notificationsRepository.create({ message, link, user: u }),
    );
    await this.notificationsRepository.save(notifications);
  }

  // Obtiene notificaciones no leídas de un usuario
  async getUnread(userId: number): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { user: { id: userId }, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  // Marca una notificación como leída
  async markAsRead(id: number): Promise<void> {
    await this.notificationsRepository.update(id, { isRead: true });
  }
}
