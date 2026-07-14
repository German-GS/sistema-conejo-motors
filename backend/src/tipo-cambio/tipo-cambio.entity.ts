import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/** Tipo de cambio del dólar por fecha (fuente: Hacienda/BCCR o carga manual). */
@Entity({ name: 'tipos_cambio' })
export class TipoCambio {
  /** Fecha del indicador (YYYY-MM-DD). */
  @PrimaryColumn({ type: 'date' })
  fecha: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  compra: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  venta: number;

  /** 'Hacienda' (API), 'BCCR' o 'Manual'. */
  @Column({ length: 12, default: 'Manual' })
  fuente: string;

  @CreateDateColumn()
  creado_en: Date;
}
