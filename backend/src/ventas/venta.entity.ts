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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_final: number;

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