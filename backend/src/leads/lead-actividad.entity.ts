// backend/src/leads/lead-actividad.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import { User } from '../users/user.entity';

export type TipoActividad =
  | 'nota'
  | 'llamada'
  | 'email'
  | 'whatsapp'
  | 'reunion'
  | 'estado_cambio'
  | 'cotizacion_creada'
  | 'financiera';

@Entity({ name: 'lead_actividades' })
export class LeadActividad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['nota', 'llamada', 'email', 'whatsapp', 'reunion', 'estado_cambio', 'cotizacion_creada', 'financiera'],
    default: 'nota',
  })
  tipo: TipoActividad;

  @Column({ type: 'text' })
  descripcion: string;

  /** Si la nota es seguimiento de una financiera: nombre de la entidad */
  @Column({ type: 'varchar', length: 60, nullable: true })
  entidad?: string;

  /** Estado de la financiera registrado en esta nota (Enviado, Aprobado, etc.) */
  @Column({ type: 'varchar', length: 40, nullable: true })
  estado_fin?: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => Lead, (lead) => lead.actividades, { onDelete: 'CASCADE' })
  @JoinColumn()
  lead: Lead;

  @ManyToOne(() => User, { nullable: true, eager: true })
  usuario: User;
}
