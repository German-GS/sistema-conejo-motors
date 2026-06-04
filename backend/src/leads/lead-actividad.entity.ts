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
  | 'cotizacion_creada';

@Entity({ name: 'lead_actividades' })
export class LeadActividad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['nota', 'llamada', 'email', 'whatsapp', 'reunion', 'estado_cambio', 'cotizacion_creada'],
    default: 'nota',
  })
  tipo: TipoActividad;

  @Column({ type: 'text' })
  descripcion: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => Lead, (lead) => lead.actividades, { onDelete: 'CASCADE' })
  @JoinColumn()
  lead: Lead;

  @ManyToOne(() => User, { nullable: true, eager: true })
  usuario: User;
}
