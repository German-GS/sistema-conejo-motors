import { Entity, PrimaryGeneratedColumn, Column, Unique, UpdateDateColumn } from 'typeorm';

/**
 * Contador atómico del secuencial de comprobantes por (sucursal, terminal, tipo).
 * El secuencial (10 dígitos) del consecutivo de Hacienda debe ser único y sin huecos
 * dentro de cada combinación. Se incrementa con un UPDATE ... RETURNING atómico para
 * evitar duplicados bajo concurrencia (ver NumeracionService.siguienteSecuencial).
 */
@Entity({ name: 'consecutivo_contadores' })
@Unique(['sucursal', 'terminal', 'tipo'])
export class ConsecutivoContador {
  @PrimaryGeneratedColumn()
  id: number;

  /** Casa comercial / sucursal (3 dígitos, p.ej. '001') */
  @Column({ type: 'varchar', length: 3 })
  sucursal: string;

  /** Terminal / punto de venta (5 dígitos, p.ej. '00001') */
  @Column({ type: 'varchar', length: 5 })
  terminal: string;

  /** Tipo de comprobante (2 dígitos: 01 factura, 02 ND, 03 NC, 04 tiquete, ...) */
  @Column({ type: 'varchar', length: 2 })
  tipo: string;

  /** Último secuencial asignado (se incrementa a partir de aquí). */
  @Column({ type: 'bigint', default: 0 })
  ultimo: string;

  @UpdateDateColumn()
  actualizado_en: Date;
}
