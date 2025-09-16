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
export type VehicleCategory =
  | 'Sedan'
  | 'SUV'
  | 'Pickup'
  | 'Hatchback'
  | 'Comercial'
  | 'Urbano';
export type Drivetrain = '4x2' | '4x4' | 'AWD';

@Entity({ name: 'vehiculos' })
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

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
  precio_costo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_venta: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_ingreso: Date;

  @Column({
    type: 'enum',
    enum: ['Disponible', 'Reservado', 'Vendido'],
    default: 'Disponible',
  })
  estado: VehicleStatus;

  // --- ESPECIFICACIONES TÉCNICAS ---

  @Column({ type: 'int', nullable: true })
  potencia_hp: number;

  @Column({ type: 'int', nullable: true })
  torque_nm: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  aceleracion_0_100: number;

  @Column({ type: 'int', nullable: true })
  velocidad_maxima: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autonomia_km: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  capacidad_bateria_kwh: number;

  @Column({ type: 'int', nullable: true })
  tiempo_carga_dc: number;

  @Column({ type: 'int', nullable: true })
  tiempo_carga_ac: number;

  @Column({
    type: 'enum',
    enum: ['Sedan', 'SUV', 'Pickup', 'Hatchback', 'Comercial', 'Urbano'],
    nullable: true,
  })
  categoria: VehicleCategory;

  @Column({
    type: 'enum',
    enum: ['4x2', '4x4', 'AWD'],
    nullable: true,
  })
  traccion: Drivetrain;

  // --- DIMENSIONES ---

  @Column({ nullable: true })
  largo_mm: number;

  @Column({ nullable: true })
  ancho_mm: number;

  @Column({ nullable: true })
  alto_mm: number;

  @Column({ nullable: true })
  distancia_ejes_mm: number;

  @Column({ nullable: true })
  peso_kg: number;

  @Column({ nullable: true })
  capacidad_maletero_l: number; // En litros

  // --- EQUIPAMIENTO Y CONFORT ---

  @Column({ nullable: true })
  numero_pasajeros: number;

  @Column({ type: 'text', nullable: true, array: true })
  colores_disponibles: string[]; // Lista de colores como "Rojo,Azul,Blanco"

  @Column({ type: 'text', nullable: true, array: true })
  seguridad: string[]; // Lista de características de seguridad

  @Column({ type: 'text', nullable: true, array: true })
  interior: string[]; // Lista de características interiores

  @Column({ type: 'text', nullable: true, array: true })
  exterior: string[]; // Lista de características exteriores

  @Column({ type: 'text', nullable: true, array: true })
  tecnologia: string[]; // Lista de características de tecnología

  // --- RELACIONES ---

  @OneToMany(() => VehicleImage, (image) => image.vehicle)
  imagenes: VehicleImage[];

  @Column({ nullable: true })
  currentLocation: string;

  @OneToMany(
    () => TrackingHistory,
    (trackingHistory) => trackingHistory.vehicle,
  )
  trackingHistory: TrackingHistory[];

  @ManyToOne(() => Bodega, (bodega) => bodega.vehiculos, {
    nullable: true,
    eager: true,
  })
  bodega: Bodega | null;
}
