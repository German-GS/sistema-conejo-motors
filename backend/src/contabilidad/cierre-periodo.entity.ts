import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

export type TipoCierre = 'Mensual' | 'Anual';

/**
 * Cierre de período contable con bloqueo. Una vez cerrado un período,
 * no se pueden postear (ni retro-fechar) asientos con fecha dentro de él,
 * salvo que un Administrador lo fuerce (asiento de ajuste marcado).
 */
@Entity({ name: 'cierres_periodo' })
export class CierrePeriodo {
  @PrimaryGeneratedColumn()
  id: number;

  /** 'YYYY-MM' para cierre Mensual, 'YYYY' para cierre Anual */
  @Column({ type: 'varchar', length: 7, unique: true })
  periodo: string;

  @Column({ type: 'enum', enum: ['Mensual', 'Anual'], default: 'Mensual' })
  tipo: TipoCierre;

  @Column({ default: true })
  cerrado: boolean;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_ingresos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_gastos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  utilidad_neta: number;

  /** Asiento de cierre generado (saldo de 4xxx/5xxx a resultados) */
  @Column({ type: 'int', nullable: true })
  asiento_cierre_id: number | null;

  @Column({ type: 'date' })
  fecha_cierre: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn()
  creado_en: Date;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  cerrado_por: User;
}
