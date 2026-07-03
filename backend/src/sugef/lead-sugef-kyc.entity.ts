import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToOne, JoinColumn, Index,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';

/** Expediente KYC / debida diligencia SUGEF de un lead */
@Entity({ name: 'leads_sugef_kyc' })
@Index('idx_sugef_kyc_lead', ['lead'], { unique: true })
export class LeadSugefKyc {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  // ── Identidad ──
  @Column({ type: 'varchar', length: 100, nullable: true })
  nacionalidad?: string;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  lugar_nacimiento?: string;

  // ── Domicilio ──
  @Column({ type: 'text', nullable: true })
  direccion?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pais_residencia?: string;

  // ── Perfil económico ──
  /** 'asalariado' | 'independiente' */
  @Column({ type: 'varchar', length: 20, nullable: true })
  tipo_ingreso?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  profesion?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  empleador?: string;

  @Column({ type: 'boolean', nullable: true })
  es_pep?: boolean;

  // ── Origen de fondos ──
  @Column({ type: 'text', nullable: true })
  origen_fondos?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  monto_estimado_usd?: number;

  // ── Declaración ──
  @Column({ type: 'date', nullable: true })
  declaracion_fecha?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
