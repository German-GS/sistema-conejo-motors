// backend/src/audit-logs/audit-logs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  exports: [TypeOrmModule], // Exportamos para que otros módulos puedan usar el repositorio
})
export class AuditLogsModule {}
