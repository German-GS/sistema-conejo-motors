import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Garantia } from './garantia.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'reclamos_garantia' })
export class ReclamoGarantia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Garantia, (g) => g.reclamos, { onDelete: 'CASCADE' })
  garantia: Garantia;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'date' })
  fecha_reclamo: string;

  @Column({ enum: ['Abierto', 'En Revision', 'Aprobado', 'Rechazado', 'Resuelto'], default: 'Abierto' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  resolucion?: string;

  @Column({ type: 'date', nullable: true })
  fecha_resolucion?: string;

  @ManyToOne(() => User, { nullable: true })
  atendido_por?: User;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
