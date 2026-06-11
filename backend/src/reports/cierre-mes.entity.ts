// backend/src/reports/cierre-mes.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'cierres_mes' })
export class CierreMes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mes: number; // 1-12

  @Column()
  anio: number;

  @CreateDateColumn()
  fecha_cierre: Date;

  @ManyToOne(() => User, { nullable: true, eager: false })
  cerrado_por: User;

  /** Snapshot de estadísticas del mes en JSON */
  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;
}
