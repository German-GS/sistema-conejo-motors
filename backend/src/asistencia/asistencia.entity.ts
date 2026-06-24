import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type TipoMarcaje = 'entrada' | 'salida' | 'almuerzo_inicio' | 'almuerzo_fin';

@Entity({ name: 'asistencia' })
export class Asistencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['entrada', 'salida', 'almuerzo_inicio', 'almuerzo_fin'] })
  tipo: TipoMarcaje;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_hora: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ubicacion: string;

  @Column({ type: 'text', nullable: true })
  nota: string;

  /** true cuando el sistema cerró la salida automáticamente a las 8pm */
  @Column({ default: false })
  es_auto_cierre: boolean;

  /** Hora original antes de que el admin la corrigiera */
  @Column({ type: 'timestamptz', nullable: true })
  hora_original?: Date;

  /** Nota del admin al corregir la hora */
  @Column({ type: 'text', nullable: true })
  nota_admin?: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  modificado_por?: User;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizado_en: Date;

  // eager: false — usar relations explícitas para evitar que TypeORM mezcle contexto
  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  usuario: User;
}
