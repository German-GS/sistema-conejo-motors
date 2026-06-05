import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';

@Entity({ name: 'lineas_compra' })
export class LineaCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrdenCompra, (o) => o.lineas, { onDelete: 'CASCADE' })
  orden: OrdenCompra;

  @Column({ length: 200 })
  descripcion: string;

  @Column({ length: 50, nullable: true })
  codigo?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 13 })
  iva_porcentaje: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;
}
