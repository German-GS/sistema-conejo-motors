import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Tabla de depreciación editable. Categorías de activo con su vida útil (y tasa
 * anual informativa) según el Reglamento de la Ley del Impuesto sobre la Renta (CR).
 * Los valores sembrados son DEFAULTS razonables; deben verificarse y ajustarse a la
 * tabla oficial vigente desde Configuración.
 */
@Entity({ name: 'categorias_depreciacion' })
export class CategoriaDepreciacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'int', default: 120 })
  vida_util_meses: number;

  /** Tasa anual de depreciación (%) — informativa; la depreciación usa vida_util_meses. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tasa_anual: number;

  /** Cuenta contable de activo sugerida (1510, 1520, 1500, …). */
  @Column({ length: 20, default: '1510' })
  cuenta_activo: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creado_en: Date;
}
