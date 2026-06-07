// En: src/cotizaciones/cotizacion.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Lead } from '../leads/lead.entity';

export type EstadoCotizacion =
  | 'Borrador'
  | 'Enviada'
  | 'Aceptada'
  | 'Rechazada'
  | 'Facturada'
  | 'Cancelada';

@Entity({ name: 'cotizaciones' })
export class Cotizacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, nullable: true })
  vehiculo_descripcion: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @Column({ type: 'date' })
  fecha_expiracion: Date;

  /** Precio de lista del vehículo (sin descuento) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  precio_lista: number;

  /** Monto de descuento en CRC */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  descuento_monto: number;

  /** Precio de venta final (lista - descuento) — base imponible antes de IVA */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_final: number;

  /** Porcentaje de IVA aplicado (13 por defecto según Ley CR) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 13 })
  iva_porcentaje: number;

  /** Monto de IVA en CRC (precio_final × iva_porcentaje / 100) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  iva_monto: number;

  /** Total a cobrar al cliente incluyendo IVA (precio_final + iva_monto) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_con_iva: number;

  // ── Gastos de inscripción ─────────────────────
  /** Marchamo primer año */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  gasto_marchamo: number;

  /** Inscripción / derechos de registro */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  gasto_inscripcion: number;

  /** Placas y derechos de circulación */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  gasto_placas: number;

  /** Otros gastos (transporte, seguro de entrega, etc.) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  gasto_otros: number;

  /** Descripción de otros gastos */
  @Column({ length: 255, nullable: true })
  gasto_otros_descripcion: string;

  /** Regalías / obsequios incluidos */
  @Column({ type: 'text', nullable: true })
  regalias: string;

  /** Notas adicionales para el cliente */
  @Column({ type: 'text', nullable: true })
  notas_cliente: string;


  /** Tipo de combustible del vehículo (requerido por algunos bancos) */
  @Column({ length: 50, default: 'Electrico' })
  tipo_combustible: string;

  @Column({
    type: 'enum',
    enum: ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Facturada', 'Cancelada'],
    default: 'Borrador',
  })
  estado: EstadoCotizacion;

  @ManyToOne(() => User)
  vendedor: User;

  @ManyToOne(() => Cliente, (cliente) => cliente.cotizaciones)
  cliente: Cliente;

  @ManyToOne(() => Vehicle, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  vehiculo: Vehicle;

  /** Lead de origen (opcional) */
  @ManyToOne(() => Lead, { nullable: true, onDelete: 'SET NULL', eager: false })
  lead: Lead | null;
}