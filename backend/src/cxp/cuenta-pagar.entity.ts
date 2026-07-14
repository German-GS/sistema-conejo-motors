import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, UpdateDateColumn,
} from 'typeorm';
import { Proveedor } from '../proveedores/proveedor.entity';

export type CxPEstado = 'Pendiente' | 'Pagado Parcial' | 'Pagado' | 'Vencido' | 'Anulado';

@Entity({ name: 'cuentas_pagar' })
export class CuentaPagar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  numero: string;

  @ManyToOne(() => Proveedor, { nullable: true })
  proveedor?: Proveedor;

  @Column({ length: 200 })
  concepto: string;

  @Column({ length: 50, nullable: true })
  factura_proveedor?: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto_original: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  monto_pagado: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldo_pendiente: number;

  // ── Multimoneda ────────────────────────────────────────────────────────────
  @Column({ length: 3, default: 'CRC' })
  moneda: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  tipo_cambio: number;

  @Column({ type: 'date' })
  fecha_vencimiento: string;

  @Column({ type: 'date', nullable: true })
  fecha_factura?: string;

  @Column({
    type: 'enum',
    enum: ['Pendiente', 'Pagado Parcial', 'Pagado', 'Vencido', 'Anulado'],
    default: 'Pendiente',
  })
  estado: CxPEstado;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @OneToMany('PagoCxP', 'cuenta', { cascade: true })
  pagos: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
