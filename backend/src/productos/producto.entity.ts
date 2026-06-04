import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type CategoriaProducto =
  | 'Repuesto'
  | 'Accesorio'
  | 'Lubricante'
  | 'Electrónico'
  | 'Herramienta'
  | 'Otro';

@Entity({ name: 'productos' })
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  sku: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: ['Repuesto', 'Accesorio', 'Lubricante', 'Electrónico', 'Herramienta', 'Otro'],
    default: 'Accesorio',
  })
  categoria: CategoriaProducto;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precio_costo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_venta: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  stock_minimo: number;

  @Column({ length: 50, nullable: true })
  unidad: string;       // piezas, litros, kg, etc.

  @Column({ length: 200, nullable: true })
  proveedor: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
