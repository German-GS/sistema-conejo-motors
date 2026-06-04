import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn,
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

  // eager: false — usar relations explícitas para evitar que TypeORM mezcle contexto
  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  usuario: User;
}
