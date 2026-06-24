// backend/src/leads/lead-documento.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import { User } from '../users/user.entity';

/**
 * Documento sensible de un cliente (cédula, estado de cuenta, CIC, etc.)
 * El archivo se almacena PRIVADO en GCS y solo se descarga vía backend autenticado.
 * Se elimina automáticamente (archivo + registro) al vencer `fecha_expiracion`.
 */
@Entity({ name: 'lead_documentos' })
export class LeadDocumento {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre original del archivo mostrado al usuario */
  @Column({ length: 255 })
  nombre: string;

  /** Ruta privada del objeto dentro del bucket de GCS (no es URL pública) */
  @Column({ length: 500 })
  gcs_path: string;

  @Column({ length: 120, nullable: true })
  tipo_mime?: string;

  @Column({ type: 'bigint', default: 0 })
  tamano_bytes: number;

  /** Si el documento se adjuntó a una actividad del timeline, su id */
  @Column({ nullable: true })
  actividad_id?: number;

  @CreateDateColumn()
  fecha_creacion: Date;

  /** A partir de esta fecha el documento se borra automáticamente */
  @Column({ type: 'timestamptz' })
  fecha_expiracion: Date;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn()
  lead: Lead;

  @ManyToOne(() => User, { nullable: true, eager: true })
  subido_por?: User;
}
