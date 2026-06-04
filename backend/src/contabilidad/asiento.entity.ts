import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { CuentaContable } from './cuenta.entity';

export type TipoAsiento =
  | 'Venta_Vehiculo'
  | 'Venta_Producto'
  | 'Compra'
  | 'Gasto'
  | 'Ingreso'
  | 'Ajuste'
  | 'Cierre'
  | 'Manual';

@Entity({ name: 'asientos_contables' })
export class AsientoContable {
  @PrimaryGeneratedColumn()
  id: number;

  /** Fecha efectiva del asiento (puede diferir de fecha_creacion) */
  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 300 })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: ['Venta_Vehiculo', 'Venta_Producto', 'Compra', 'Gasto', 'Ingreso', 'Ajuste', 'Cierre', 'Manual'],
    default: 'Manual',
  })
  tipo: TipoAsiento;

  /** Referencia externa: ID de venta, orden, etc. */
  @Column({ nullable: true })
  referencia_id: number;

  @Column({ length: 100, nullable: true })
  referencia_tipo: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  creado_por: User;

  @OneToMany(() => LineaAsiento, (l) => l.asiento, { cascade: true, eager: true })
  lineas: LineaAsiento[];
}

@Entity({ name: 'lineas_asiento' })
export class LineaAsiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AsientoContable, (a) => a.lineas, { onDelete: 'CASCADE' })
  asiento: AsientoContable;

  @ManyToOne(() => CuentaContable, { eager: true, onDelete: 'RESTRICT' })
  cuenta: CuentaContable;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  debe: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  haber: number;

  @Column({ length: 200, nullable: true })
  descripcion: string;
}
