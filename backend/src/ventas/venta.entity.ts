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

  // Una venta está ligada a UNA cotización. A través de ella,
  // podemos saber el cliente y el vehículo.
  @OneToOne(() => Cotizacion)
  @JoinColumn()
  cotizacion: Cotizacion;

  // Guardamos al vendedor directamente en la venta, ya que él es
  // quien recibe la comisión y cierra el trato.
  @ManyToOne(() => User)
  vendedor: User;
}
