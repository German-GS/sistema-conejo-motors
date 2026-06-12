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
import { TrackingHistory } from '../tracking/tracking.entity';
import { VehicleProfile } from '../vehicle-profiles/vehicle-profile.entity';

export type VehicleStatus = 'Disponible' | 'Reservado' | 'Vendido';
export type VehicleVisibility = 'Visible' | 'Oculto' | 'Agotado' | 'Contrapedido';
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
  precio_costo: number;  // Costo real de inventario (cuenta 1030)

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_venta: number;  // Precio de lista al cliente

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precio_venta_usd: number;  // Precio de venta en dólares (referencia)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, default: 0 })
  descuento_porcentaje: number;  // % de descuento aplicado

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precio_venta_final: number;  // precio_venta con descuento aplicado (calculado)

  @CreateDateColumn({ type: 'timestamp' })
  fecha_ingreso: Date;

  @Column({
    type: 'enum',
    enum: ['Disponible', 'Reservado', 'Vendido'],
    default: 'Disponible',
  })
  estado: VehicleStatus;

  @Column({
    type: 'enum',
    enum: ['Visible', 'Oculto', 'Agotado', 'Contrapedido'],
    default: 'Visible',
  })
  visibilidad: VehicleVisibility;

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

  @Column({ type: 'text', nullable: true })
  colores_disponibles: string;

  @Column({ type: 'text', nullable: true })
  seguridad: string;

  @Column({ type: 'text', nullable: true })
  interior: string;

  @Column({ type: 'text', nullable: true })
  exterior: string;
  // --- FIN DE LA CORRECCIÓN ---

  @Column({ type: 'text', nullable: true })
  tecnologia: string;

  // --- DATOS CONTABLES (Cuenta 1030) ---

  @Column({ length: 20, nullable: true, default: '1030' })
  cuenta_contable: string;

  @Column({ length: 10, nullable: true })
  incoterm: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo_factura_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tipo_cambio: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  tasa_caldera: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  acarreo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo_nacionalizacion: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  inscripcion_traspaso: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  marchamo: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  // --- RELACIONES ---

  @ManyToOne(() => VehicleProfile)
  profile: VehicleProfile;

  @Column({ nullable: true })
  currentLocation: string;

  @OneToMany(
    () => TrackingHistory,
    (trackingHistory) => trackingHistory.vehicle,
  )
  trackingHistory: TrackingHistory[];

  @ManyToOne(() => Bodega, (bodega) => bodega.vehiculos, {
    nullable: true,
    eager: true, // eager: true en bodega es correcto como lo tenías
  })
  bodega: Bodega | null;

} 