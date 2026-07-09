import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Producto } from './producto.entity';

export type EstadoOrden = 'Pendiente' | 'Completada' | 'Anulada';

@Entity({ name: 'ordenes_producto' })
export class OrdenProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  cliente_nombre: string;

  @Column({ length: 100, nullable: true })
  cliente_cedula: string;

  @Column({ length: 100, nullable: true })
  cliente_telefono: string;

  @Column({
    type: 'enum',
    enum: ['Pendiente', 'Completada', 'Anulada'],
    default: 'Pendiente',
  })
  estado: EstadoOrden;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 50, default: 'Efectivo' })
  metodo_pago: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL', nullable: true })
  vendedor: User;

  @OneToMany(() => LineaOrden, (l) => l.orden, { cascade: true, eager: true })
  lineas: LineaOrden[];
}

@Entity({ name: 'lineas_orden_producto' })
export class LineaOrden {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrdenProducto, (o) => o.lineas, { onDelete: 'CASCADE' })
  orden: OrdenProducto;

  @ManyToOne(() => Producto, { eager: true, onDelete: 'RESTRICT' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento_linea: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  /** Tarifa de IVA de la línea (D-150): T13 | T04 | T02 | T01 | T005 | Exento | NoSujeto */
  @Column({ length: 10, default: 'T13' })
  iva_tarifa: string;
}
