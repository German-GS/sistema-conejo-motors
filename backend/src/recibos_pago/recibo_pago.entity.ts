import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'recibos_pago' })
export class ReciboPago {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  usuario: User;

  @Column({ type: 'date' })
  fecha_pago: Date;

  @Column({ type: 'date' })
  periodo_inicio: Date; 

  @Column({ type: 'date' })
  periodo_fin: Date; 
  
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_base_periodo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  comisiones_ganadas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  horas_extra: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_bruto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deduccion_sem: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deduccion_ivm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deduccion_banco_popular: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deduccion_renta: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  otras_deducciones: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_neto: number;
}