import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Lead } from '../leads/lead.entity';
import { Cliente } from '../clientes/cliente.entity';

export type CitaTipo = 'Llamada' | 'Reunion' | 'Seguimiento' | 'Prueba de Manejo' | 'Otro';
export type CitaEstado = 'Pendiente' | 'Completada' | 'Cancelada';

@Entity({ name: 'citas' })
export class Cita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'enum',
    enum: ['Llamada', 'Reunion', 'Seguimiento', 'Prueba de Manejo', 'Otro'],
    default: 'Seguimiento',
  })
  tipo: CitaTipo;

  @Column({ type: 'timestamp' })
  fecha_hora: Date;

  @Column({ type: 'int', default: 30 })
  duracion_minutos: number;

  @Column({
    type: 'enum',
    enum: ['Pendiente', 'Completada', 'Cancelada'],
    default: 'Pendiente',
  })
  estado: CitaEstado;

  @Column({ type: 'text', nullable: true })
  notas_resultado?: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  asignado_a: User;

  @ManyToOne(() => Lead, { nullable: true, eager: false, onDelete: 'SET NULL' })
  lead?: Lead;

  @ManyToOne(() => Cliente, { nullable: true, eager: false, onDelete: 'SET NULL' })
  cliente?: Cliente;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
