import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { CuentaCobrar } from './cuenta-cobrar.entity';

@Entity({ name: 'pagos_cxc' })
export class PagoCxC {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CuentaCobrar, (c) => c.pagos, { onDelete: 'CASCADE' })
  cuenta: CuentaCobrar;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 100, nullable: true })
  referencia?: string;

  @Column({ length: 50, nullable: true })
  metodo_pago?: string; // Efectivo, SINPE, Transferencia, Cheque

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @CreateDateColumn()
  creado_en: Date;
}
