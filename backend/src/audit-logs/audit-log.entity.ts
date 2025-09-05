// backend/src/audit-logs/audit-log.entity.ts
import { User } from '../users/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  usuario: User;

  @Column()
  accion: string; // Ej: 'ELIMINAR_RECIBO_PAGO'

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_hora: Date;

  @Column({ type: 'text', nullable: true })
  detalles: string; // Ej: 'Recibo ID: 5'
}
