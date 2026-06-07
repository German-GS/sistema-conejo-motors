// backend/src/leads/lead-financiamiento.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Lead } from './lead.entity';

export type EntidadFinanciera =
  | 'Banco Promerica'
  | 'Davivienda'
  | 'Lafise'
  | 'BAC'
  | 'Coopenae'
  | 'Otra';

export type EstadoFinanciamiento =
  | 'Pendiente'
  | 'Enviado'
  | 'En Revisión'
  | 'Pre-Aprobado'
  | 'Aprobado'
  | 'Rechazado';

@Entity({ name: 'lead_financiamientos' })
export class LeadFinanciamiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn()
  lead: Lead;

  @Column({
    type: 'enum',
    enum: ['Banco Promerica', 'Davivienda', 'Lafise', 'BAC', 'Coopenae', 'Otra'],
  })
  entidad: EntidadFinanciera;

  @Column({
    type: 'enum',
    enum: ['Pendiente', 'Enviado', 'En Revisión', 'Pre-Aprobado', 'Aprobado', 'Rechazado'],
    default: 'Pendiente',
  })
  estado: EstadoFinanciamiento;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  monto_solicitado?: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  monto_aprobado?: number;

  @Column({ type: 'int', nullable: true })
  plazo_meses?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tasa_anual?: number;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ type: 'date', nullable: true })
  fecha_envio?: string;

  @Column({ type: 'date', nullable: true })
  fecha_respuesta?: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
