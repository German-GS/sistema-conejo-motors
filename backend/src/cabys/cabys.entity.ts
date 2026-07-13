import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/**
 * Catálogo CABYS (Bienes y Servicios, BCCR/Hacienda). El código de 13 dígitos es
 * obligatorio por línea en la factura electrónica v4.4 y sugiere la tarifa de IVA.
 */
@Entity({ name: 'cabys' })
export class Cabys {
  /** Código CABYS de 13 dígitos (puede empezar con 0). */
  @PrimaryColumn({ type: 'varchar', length: 13 })
  codigo: string;

  @Index()
  @Column({ type: 'varchar', length: 500 })
  descripcion: string;

  /** Tarifa de IVA sugerida como fracción (0.13, 0.04, 0.01, 0). */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.13 })
  impuesto: number;
}
