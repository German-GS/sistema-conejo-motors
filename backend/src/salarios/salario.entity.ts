// backend/src/salarios/salario.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'salarios' })
export class Salario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  salario_base: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  comision_porcentaje: number;

  @Column({ type: 'date' })
  fecha_efectiva: Date;

  @ManyToOne(() => User, (user) => user.salarios)
  usuario: User;
}
