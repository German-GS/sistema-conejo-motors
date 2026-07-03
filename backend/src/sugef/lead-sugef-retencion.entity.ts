import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { Factura } from '../facturacion/factura.entity';

/** Registro de retención SUGEF (5 años) que se dispara al facturar un lead */
@Entity({ name: 'leads_sugef_retencion' })
@Index('idx_sugef_retencion_lead', ['lead'], { unique: true })
export class LeadSugefRetencion {
  @PrimaryGeneratedColumn()
  id: number;

  /** onDelete RESTRICT: no se puede borrar un lead con expediente bajo retención */
  @ManyToOne(() => Lead, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Factura, { nullable: true })
  @JoinColumn({ name: 'factura_id' })
  factura?: Factura;

  @Column({ type: 'date' })
  fecha_venta: string;

  /** fecha_venta + 5 años */
  @Column({ type: 'date' })
  retener_hasta: string;

  @Column({ type: 'boolean', default: true })
  docs_bloqueados: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
