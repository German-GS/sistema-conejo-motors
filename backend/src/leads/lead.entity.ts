// backend/src/leads/lead.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Campana } from '../campanas/campana.entity';

export type LeadStatus = 'Nuevo' | 'Contactado' | 'En Progreso' | 'Prueba de Manejo' | 'Cotizacion Enviada' | 'Negociacion' | 'Cerrado' | 'Perdido';
export type LeadFuente = 'Web' | 'Instagram' | 'Facebook' | 'WhatsApp' | 'TikTok' | 'Referido' | 'Presencial' | 'Llamada' | 'Otro';
export type LeadTipoPago = 'Contado' | 'Crédito';

@Entity({ name: 'leads' })
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre_cliente: string;

  @Column({ length: 100 })
  email_cliente: string;

  @Column({ length: 20, nullable: true })
  telefono_cliente?: string;

  @Column({
    type: 'enum',
    enum: ['Nuevo', 'Contactado', 'En Progreso', 'Prueba de Manejo', 'Cotizacion Enviada', 'Negociacion', 'Cerrado', 'Perdido'],
    default: 'Nuevo',
  })
  estado: LeadStatus;

  @Column({
    type: 'enum',
    enum: ['Web', 'Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'Referido', 'Presencial', 'Llamada', 'Otro'],
    default: 'Web',
  })
  fuente: LeadFuente;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ type: 'date', nullable: true })
  fecha_followup?: string;

  @Column({ default: false })
  contacted_by_email: boolean;

  @Column({ default: false })
  contacted_by_phone: boolean;

  @Column({ default: false })
  contacted_by_whatsapp: boolean;

  @Column({
    type: 'enum',
    enum: ['Contado', 'Crédito'],
    nullable: true,
  })
  tipo_pago?: LeadTipoPago;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => User, { nullable: true, eager: false })
  vendedor_asignado: User;

  @ManyToOne(() => Vehicle, { nullable: true, eager: true })
  vehiculo_interes?: Vehicle;

  @ManyToOne(() => Campana, { nullable: true, eager: true, onDelete: 'SET NULL' })
  campana?: Campana;

  @OneToMany('LeadActividad', 'lead', { cascade: true })
  actividades: any[];
}
