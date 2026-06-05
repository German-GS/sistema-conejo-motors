import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, UpdateDateColumn,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';

export type OTEstado = 'Recibido' | 'Diagnostico' | 'En Reparacion' | 'Listo' | 'Entregado' | 'Cancelado';

@Entity({ name: 'ordenes_trabajo' })
export class OrdenTrabajo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  numero: string;

  @ManyToOne(() => Cliente, { nullable: true })
  cliente?: Cliente;

  @ManyToOne(() => Vehicle, { nullable: true })
  vehiculo?: Vehicle;

  @Column({ length: 17, nullable: true })
  vin_manual?: string; // Para vehículos no en inventario

  @Column({ length: 200, nullable: true })
  descripcion_vehiculo?: string; // marca/modelo si no está en inventario

  @Column({ type: 'text' })
  descripcion_problema: string;

  @Column({ type: 'text', nullable: true })
  diagnostico?: string;

  @Column({ type: 'text', nullable: true })
  trabajo_realizado?: string;

  @Column({
    type: 'enum',
    enum: ['Recibido', 'Diagnostico', 'En Reparacion', 'Listo', 'Entregado', 'Cancelado'],
    default: 'Recibido',
  })
  estado: OTEstado;

  @ManyToOne(() => User, { nullable: true })
  tecnico?: User;

  @Column({ type: 'date' })
  fecha_ingreso: string;

  @Column({ type: 'date', nullable: true })
  fecha_estimada_entrega?: string;

  @Column({ type: 'date', nullable: true })
  fecha_entrega_real?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_repuestos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_mano_obra: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @OneToMany('DetalleTaller', 'orden', { cascade: true })
  detalles: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
