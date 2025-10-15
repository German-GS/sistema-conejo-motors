// src/leads/leads.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, User, Vehicle]),
    NotificationsModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  // --- 👇 AÑADE ESTA LÍNEA 👇 ---
  exports: [LeadsService], // Hace que LeadsService esté disponible para otros módulos.
})
export class LeadsModule {}