// backend/src/ventas/venta.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Factura } from '../facturacion/factura.entity';

@Entity({ name: 'ventas' })
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fecha_venta: Date;

  @Column({ length: 50 })
  metodo_pago: string;

  /** Subtotal antes de IVA (= cotizacion.precio_final) */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_final: number;

  /** Monto de IVA cobrado */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  iva_monto: number;

  /** Total cobrado al cliente (monto_final + iva_monto) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_con_iva: number;

  // ── Datos de facturación (puede diferir del cliente de la cotización) ──────
  @Column({ length: 200, nullable: true })
  factura_nombre: string;

  /** 'fisica' | 'juridica' | 'extranjero' */
  @Column({ length: 20, nullable: true })
  factura_tipo_cedula: string;

  @Column({ length: 20, nullable: true })
  factura_cedula: string;

  @Column({ length: 100, nullable: true })
  factura_email: string;

  @Column({ length: 20, nullable: true })
  factura_telefono: string;

  @Column({ type: 'text', nullable: true })
  factura_notas: string;

  @Column({ length: 30, default: 'Completada' })
  estado: string;

  @OneToOne(() => Cotizacion)
  @JoinColumn()
  cotizacion: Cotizacion;

  @ManyToOne(() => User)
  vendedor: User;

  // --- 👇 CORRECCIÓN AQUÍ 👇 ---
  // Se usa una función () => Factura para romper la dependencia circular
  @OneToOne(() => Factura, (factura) => factura.venta)
  @JoinColumn()
  factura: Factura;
}