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

export type EstadoCotizacion =
  | 'Borrador'
  | 'Enviada'
  | 'Aceptada'
  | 'Rechazada';

@Entity({ name: 'cotizaciones' })
export class Cotizacion {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fecha_creacion: Date;

  @Column({ type: 'date' })
  fecha_expiracion: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_final: number;

  @Column({
    type: 'enum',
    enum: ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'],
    default: 'Borrador',
  })
  estado: EstadoCotizacion;

  @ManyToOne(() => User)
  vendedor: User;

  @ManyToOne(() => Cliente, (cliente) => cliente.cotizaciones)
  cliente: Cliente;

  @ManyToOne(() => Vehicle)
  vehiculo: Vehicle;
}
