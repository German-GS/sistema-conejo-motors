import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';

export type CampanaPlataforma = 'Facebook' | 'Instagram' | 'TikTok' | 'Otro';
export type CampanaEstado    = 'Activa' | 'Pausada' | 'Finalizada';

@Entity({ name: 'campanas' })
export class Campana {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({
    type: 'enum',
    enum: ['Facebook', 'Instagram', 'TikTok', 'Otro'],
    default: 'Facebook',
  })
  plataforma: CampanaPlataforma;

  @Column({
    type: 'enum',
    enum: ['Activa', 'Pausada', 'Finalizada'],
    default: 'Activa',
  })
  estado: CampanaEstado;

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'date', nullable: true })
  fecha_fin?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  presupuesto_crc: number;

  @Column({ type: 'text', nullable: true })
  objetivo?: string;

  /** ID del gasto operativo generado automáticamente al crear la campaña */
  @Column({ nullable: true })
  gasto_id?: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  creado_por?: User;

  @CreateDateColumn()
  fecha_creacion: Date;
}
