import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'cajas_chicas' })
export class CajaChica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @ManyToOne(() => User, { nullable: true })
  responsable?: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_inicial: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldo_actual: number;

  @Column({ enum: ['Abierta', 'Cerrada'], default: 'Abierta' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @OneToMany('MovimientoCaja', 'caja', { cascade: true })
  movimientos: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
