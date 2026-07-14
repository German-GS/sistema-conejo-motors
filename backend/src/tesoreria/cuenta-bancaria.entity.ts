import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

@Entity({ name: 'cuentas_bancarias' })
export class CuentaBancaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  banco: string;

  @Column({ length: 50 })
  numero_cuenta: string;

  @Column({ length: 50, nullable: true })
  iban?: string;

  @Column({ enum: ['Corriente', 'Ahorro', 'Dolares', 'Colones'], default: 'Corriente' })
  tipo: string;

  @Column({ enum: ['CRC', 'USD'], default: 'CRC' })
  moneda: string;

  /** Código de la cuenta contable del mayor asociada (1110 corriente, 1120 ahorro, etc.). */
  @Column({ length: 20, default: '1110' })
  cuenta_contable: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldo_inicial: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldo_actual: number;

  @Column({ default: true })
  activa: boolean;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @OneToMany('MovimientoBancario', 'cuenta', { cascade: false })
  movimientos: any[];

  @CreateDateColumn()
  creado_en: Date;
}
