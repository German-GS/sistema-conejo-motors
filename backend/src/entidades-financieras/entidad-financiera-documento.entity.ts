import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { EntidadFinanciera } from './entidad-financiera.entity';

/** Documento/formulario en blanco que provee la entidad (CIC, KYC, etc.) */
@Entity({ name: 'entidad_financiera_documentos' })
export class EntidadFinancieraDocumento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  /** URL pública del formulario en GCS (se comparte por WhatsApp) */
  @Column({ length: 500 })
  url: string;

  @Column({ length: 120, nullable: true })
  tipo_mime?: string;

  @Column({ type: 'bigint', default: 0 })
  tamano_bytes: number;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => EntidadFinanciera, (e) => e.documentos, { onDelete: 'CASCADE' })
  @JoinColumn()
  entidad: EntidadFinanciera;
}
