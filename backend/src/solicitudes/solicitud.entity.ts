import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type TipoSolicitud =
  | 'dia_libre'
  | 'vacaciones'
  | 'salida_anticipada'
  | 'llegada_tarde'
  | 'permiso_personal'
  | 'otro';

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

@Entity({ name: 'solicitudes' })
export class Solicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['dia_libre','vacaciones','salida_anticipada','llegada_tarde','permiso_personal','otro'] })
  tipo: TipoSolicitud;

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'date', nullable: true })
  fecha_fin: string;

  /** Hora específica si es salida/llegada */
  @Column({ type: 'varchar', length: 10, nullable: true })
  hora: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'enum', enum: ['pendiente','aprobada','rechazada'], default: 'pendiente' })
  estado: EstadoSolicitud;

  @Column({ type: 'text', nullable: true })
  respuesta_admin: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  empleado: User;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  revisado_por: User;
}
