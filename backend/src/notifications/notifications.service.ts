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
    const admins = await this.usersRepository.find({
      where: { rol: { nombre: 'Administrador' } },
    });

    const notifications = admins.map((admin) =>
      this.notificationsRepository.create({
        message,
        link,
        user: admin,
      }),
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
