import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, UpdateDateColumn,
} from 'typeorm';
import { Proveedor } from '../proveedores/proveedor.entity';
import { User } from '../users/user.entity';

export type OrdenCompraEstado = 'Borrador' | 'Enviada' | 'Recibida Parcial' | 'Recibida' | 'Cancelada';

@Entity({ name: 'ordenes_compra' })
export class OrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  numero: string;

  @ManyToOne(() => Proveedor, { nullable: true })
  proveedor?: Proveedor;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'date', nullable: true })
  fecha_entrega_esperada?: string;

  @Column({
    type: 'enum',
    enum: ['Borrador', 'Enviada', 'Recibida Parcial', 'Recibida', 'Cancelada'],
    default: 'Borrador',
  })
  estado: OrdenCompraEstado;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  iva: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @ManyToOne(() => User, { nullable: true })
  creado_por?: User;

  @OneToMany('LineaCompra', 'orden', { cascade: true })
  lineas: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
