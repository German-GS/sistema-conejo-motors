import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'movimientos_bancarios' })
export class MovimientoBancario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CuentaBancaria, (c) => c.movimientos, { onDelete: 'CASCADE' })
  cuenta: CuentaBancaria;

  @Column({ enum: ['Deposito', 'Retiro', 'Transferencia Entrada', 'Transferencia Salida', 'Pago', 'Cobro', 'Ajuste'] })
  tipo: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ length: 250 })
  descripcion: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 100, nullable: true })
  referencia?: string;

  @Column({ default: false })
  conciliado: boolean;

  /** 'Manual' (registrado en el sistema) o 'Importado' (del estado de cuenta del banco). */
  @Column({ length: 12, default: 'Manual' })
  origen: string;

  /** Línea de asiento contable con la que se concilió (si aplica). */
  @Column({ type: 'int', nullable: true })
  asiento_linea_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  registrado_por?: User;

  @CreateDateColumn()
  creado_en: Date;
}
