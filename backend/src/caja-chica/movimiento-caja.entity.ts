import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { CajaChica } from './caja-chica.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'movimientos_caja' })
export class MovimientoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CajaChica, (c) => c.movimientos, { onDelete: 'CASCADE' })
  caja: CajaChica;

  @Column({ enum: ['Ingreso', 'Egreso'] })
  tipo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ length: 200 })
  descripcion: string;

  @Column({ length: 100, nullable: true })
  categoria?: string; // Alimentacion, Transporte, Papelería, etc.

  @Column({ length: 100, nullable: true })
  numero_comprobante?: string;

  @Column({ type: 'date' })
  fecha: string;

  @ManyToOne(() => User, { nullable: true })
  registrado_por?: User;

  @CreateDateColumn()
  creado_en: Date;
}
