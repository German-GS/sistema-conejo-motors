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

  /** Tasa anual FISCAL (%) del Anexo Nº 2 — informativa. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tasa_anual: number;

  /**
   * Vida útil FISCAL (meses) según el Anexo Nº 2 (Decreto 43198-H). Distinta de la
   * financiera (vida_util_meses): la fiscal se usa solo para el subledger tributario.
   * Nullable a propósito: NULL marca una categoría aún no normalizada (para backfill).
   */
  @Column({ type: 'int', nullable: true })
  vida_util_fiscal_meses: number | null;

  /** Método fiscal permitido por el Anexo: 'LineaRecta' | 'SumaDigitos'. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  metodo_fiscal: string | null;

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
