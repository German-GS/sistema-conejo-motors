import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { OrdenTrabajo } from './orden-trabajo.entity';

@Entity({ name: 'detalles_taller' })
export class DetalleTaller {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrdenTrabajo, (o) => o.detalles, { onDelete: 'CASCADE' })
  orden: OrdenTrabajo;

  @Column({ enum: ['Repuesto', 'Mano de Obra', 'Otro'] })
  tipo: string;

  @Column({ length: 200 })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;
}
