import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { User } from '../users/user.entity'; // Importamos User

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])], // Añadimos User
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService], // Exportamos para usarlo en otros módulos
})
export class NotificationsModule {}
