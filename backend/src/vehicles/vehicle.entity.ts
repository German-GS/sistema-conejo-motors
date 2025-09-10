// backend/src/vehicles/vehicle.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Bodega } from '../bodegas/bodega.entity';
import { VehicleImage } from './vehicle-image.entity';
import { TrackingHistory } from '../tracking/tracking.entity';

export type VehicleStatus = 'Disponible' | 'Reservado' | 'Vendido';

@Entity({ name: 'vehiculos' })
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => VehicleImage, (image) => image.vehicle)
  imagenes: VehicleImage[];

  @Column({ unique: true, length: 17 })
  vin: string;

  @Column({ length: 50 })
  marca: string;

  @Column({ length: 50 })
  modelo: string;

  @Column()
  año: number;

  @Column({ length: 30 })
  color: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_costo: number; // Costo de adquisición

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_venta: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_ingreso: Date; // Se genera automáticamente al crear

  @Column()
  autonomia_km: number;

  @Column()
  potencia_hp: number;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  capacidad_bateria_kwh: number;

  @Column({
    type: 'enum',
    enum: ['Disponible', 'Reservado', 'Vendido'],
    default: 'Disponible',
  })
  estado: VehicleStatus;

  @Column({ nullable: true }) // Permite que la ubicación inicial sea nula si no hay bodegas
  currentLocation: string;

  @OneToMany(
    () => TrackingHistory,
    (trackingHistory) => trackingHistory.vehicle,
  )
  trackingHistory: TrackingHistory[];

  @ManyToOne(() => Bodega, (bodega) => bodega.vehiculos, {
    nullable: true, // Un vehículo puede no tener bodega asignada
    eager: true, // Carga automáticamente la bodega al buscar un vehículo
  })
  bodega: Bodega | null;
}
