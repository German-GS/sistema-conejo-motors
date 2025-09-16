// backend/src/leads/lead.entity.ts
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

  // --- 👇 INICIO DE LA MODIFICACIÓN 👇 ---
  @Column({ default: false })
  contacted_by_email: boolean;

  @Column({ default: false })
  contacted_by_phone: boolean;
  // --- 👆 FIN DE LA MODIFICACIÓN 👆 ---

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => User)
  vendedor_asignado: User;

  @ManyToOne(() => Vehicle, { nullable: true, eager: true }) // eager: true carga el vehículo automáticamente
  vehiculo_interes?: Vehicle;
}