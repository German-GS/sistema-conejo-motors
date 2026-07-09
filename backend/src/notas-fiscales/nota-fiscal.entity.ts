import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

export type TipoNota = 'Credito' | 'Debito';
export type NaturalezaNota = 'Venta' | 'Compra';

/**
 * Nota de crédito/débito que ajusta el IVA del período (devoluciones, descuentos
 * o cargos posteriores). Genera su asiento y modifica el débito/crédito del mes.
 */
@Entity({ name: 'notas_fiscales' })
export class NotaFiscal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['Credito', 'Debito'], default: 'Credito' })
  tipo: TipoNota;

  @Column({ type: 'enum', enum: ['Venta', 'Compra'], default: 'Venta' })
  naturaleza: NaturalezaNota;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  base: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  iva: number;

  @Column({ length: 10, default: 'T13' })
  iva_tarifa: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  documento_ref: string | null; // factura/OC que ajusta

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ type: 'int', nullable: true })
  asiento_id: number | null;

  @CreateDateColumn()
  creado_en: Date;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  creado_por: User;
}
