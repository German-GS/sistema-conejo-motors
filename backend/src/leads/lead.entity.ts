// src/leads/lead.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export type LeadStatus = 'Nuevo' | 'Contactado' | 'En Progreso' | 'Cerrado';

@Entity({ name: 'leads' })
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre_cliente: string;

  @Column({ length: 100 })
  email_cliente: string;

  @Column({ length: 20, nullable: true })
  telefono_cliente?: string;

  @Column({
    type: 'enum',
    enum: ['Nuevo', 'Contactado', 'En Progreso', 'Cerrado'],
    default: 'Nuevo',
  })
  estado: LeadStatus;

  @CreateDateColumn()
  fecha_creacion: Date;

  // Relación: Un lead pertenece a UN vendedor (User)
  @ManyToOne(() => User)
  vendedor_asignado: User;

  // Relación: Un lead puede estar interesado en UN vehículo (opcional)
  @ManyToOne(() => Vehicle, { nullable: true })
  vehiculo_interes?: Vehicle;
}
