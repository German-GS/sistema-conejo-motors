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

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  creado_en: Date;
}
