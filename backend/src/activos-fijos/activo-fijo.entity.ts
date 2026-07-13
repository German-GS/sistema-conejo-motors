import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export type CategoriaActivo =
  | 'Mobiliario'
  | 'Equipo de Cómputo'
  | 'Equipo de Taller'
  | 'Edificio / Instalaciones'
  | 'Otro';

@Entity({ name: 'activos_fijos' })
export class ActivoFijo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: ['Mobiliario', 'Equipo de Cómputo', 'Equipo de Taller', 'Edificio / Instalaciones', 'Otro'], default: 'Otro' })
  categoria: CategoriaActivo;

  /** Cuenta contable del activo (p.ej. 1510 Mobiliario y Equipo) */
  @Column({ length: 20, default: '1510' })
  cuenta_activo: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  costo: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  valor_residual: number;

  @Column({ type: 'int', default: 60 })
  vida_util_meses: number;

  @Column({ type: 'date' })
  fecha_adquisicion: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  depreciacion_acumulada: number;

  /** Fecha del último asiento de depreciación (YYYY-MM), para no duplicar en el mes */
  @Column({ type: 'varchar', length: 7, nullable: true })
  ultimo_periodo_depreciado: string | null;

  // ── Registro del libro de activos depreciables (Reglamento, punto 1.1) ────
  @Column({ type: 'varchar', length: 40, nullable: true })
  numero_inventario: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  localizacion: string | null;

  @Column({ type: 'varchar', length: 20, default: 'LineaRecta' })
  metodo_depreciacion: string; // financiero

  // ── Carril FISCAL (Anexo Nº 2) — NO se contabiliza; subledger tributario ──
  @Column({ type: 'int', default: 120 })
  vida_util_fiscal_meses: number;

  @Column({ type: 'varchar', length: 20, default: 'LineaRecta' })
  metodo_fiscal: string; // 'LineaRecta' | 'SumaDigitos'

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  depreciacion_fiscal_acumulada: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  ultimo_periodo_fiscal: string | null;

  @Column({ default: true })
  activo: boolean;

  /**
   * true = una operación (alta/baja/venta/depreciación) NO pudo postear su asiento
   * contable y quedó pendiente de reconciliación. Se limpia al reintentar con éxito.
   */
  @Column({ default: false })
  pendiente_contabilizar: boolean;

  /** Detalle del último fallo contable, para diagnóstico en la reconciliación. */
  @Column({ type: 'text', nullable: true })
  error_contable: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  creado_en: Date;
}
