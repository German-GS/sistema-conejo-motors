import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, UpdateDateColumn,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { User } from '../users/user.entity';

export type CxCEstado = 'Pendiente' | 'Pagado Parcial' | 'Pagado' | 'Vencido' | 'Anulado';
export type CxCTipo = 'Venta Vehiculo' | 'Venta Repuesto' | 'Servicio' | 'Financiamiento' | 'Otro';

@Entity({ name: 'cuentas_cobrar' })
export class CuentaCobrar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  numero: string;

  @ManyToOne(() => Cliente, { nullable: true })
  cliente?: Cliente;

  @Column({ length: 200 })
  concepto: string;

  @Column({
    type: 'enum',
    enum: ['Venta Vehiculo', 'Venta Repuesto', 'Servicio', 'Financiamiento', 'Otro'],
    default: 'Otro',
  })
  tipo: CxCTipo;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto_original: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  monto_pagado: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  saldo_pendiente: number;

  @Column({ type: 'date' })
  fecha_vencimiento: string;

  @Column({ type: 'date', nullable: true })
  fecha_emision?: string;

  @Column({
    type: 'enum',
    enum: ['Pendiente', 'Pagado Parcial', 'Pagado', 'Vencido', 'Anulado'],
    default: 'Pendiente',
  })
  estado: CxCEstado;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @ManyToOne(() => User, { nullable: true })
  responsable?: User;

  @OneToMany('PagoCxC', 'cuenta', { cascade: true })
  pagos: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
