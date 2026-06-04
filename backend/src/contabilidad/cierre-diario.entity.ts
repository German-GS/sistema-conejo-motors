import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'cierres_diarios' })
export class CierreDiario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  fecha: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_ingresos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_gastos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  utilidad_neta: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  ventas_vehiculos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  ventas_productos: number;

  @Column({ type: 'int', default: 0 })
  num_transacciones: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({ default: false })
  cerrado: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  cerrado_por: User;
}
