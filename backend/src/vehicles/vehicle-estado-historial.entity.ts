import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { User } from '../users/user.entity';

// Registra cada transición de estado/visibilidad de un vehículo para auditoría
@Entity({ name: 'vehiculo_estado_historial' })
export class VehicleEstadoHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  vehiculo: Vehicle;

  @Column({ length: 50, nullable: true })
  estado_anterior?: string;

  @Column({ length: 50 })
  estado_nuevo: string;

  // Qué cambió: 'estado' (Disponible/Reservado/Vendido) o 'visibilidad'/'clasificacion'
  @Column({ length: 30, default: 'estado' })
  tipo: string;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @ManyToOne(() => User, { nullable: true })
  usuario?: User;

  @CreateDateColumn()
  fecha: Date;
}
