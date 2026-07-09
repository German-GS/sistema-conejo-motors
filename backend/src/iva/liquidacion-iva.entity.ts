import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

export type EstadoLiquidacion = 'Pendiente' | 'Generada' | 'Presentada' | 'Pagada';

/**
 * Liquidación mensual de IVA (D-150, TRIBU-CR). Snapshot del período por tarifa,
 * análogo al cierre pero para el impuesto. El cálculo se apoya en las cuentas
 * 2200 (débito fiscal) y 1210 (crédito fiscal) más el desglose por tarifa.
 */
@Entity({ name: 'liquidaciones_iva' })
export class LiquidacionIVA {
  @PrimaryGeneratedColumn()
  id: number;

  /** YYYY-MM del período declarado */
  @Column({ type: 'varchar', length: 7, unique: true })
  periodo: string;

  @Column({ type: 'enum', enum: ['Pendiente', 'Generada', 'Presentada', 'Pagada'], default: 'Pendiente' })
  estado: EstadoLiquidacion;

  /** { T13:{base,iva}, T04:{...}, Exento:{base}, NoSujeto:{base} } */
  @Column({ type: 'jsonb', nullable: true })
  ventas_por_tarifa: Record<string, { base: number; iva: number }> | null;

  @Column({ type: 'jsonb', nullable: true })
  compras_por_tarifa: Record<string, { base: number; iva: number }> | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  debito_fiscal: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  credito_fiscal_bruto: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 100 })
  porcentaje_prorrata: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  credito_fiscal_aplicable: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  retenciones_iva: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldo_a_favor_anterior: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  iva_a_pagar: number;

  @Column({ type: 'int', nullable: true })
  asiento_id: number | null;

  @Column({ type: 'date', nullable: true })
  fecha_generacion: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_presentacion: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_pago: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  creado_en: Date;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  generado_por: User;
}
