// backend/src/vehicles/vehicle.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { VehicleImage } from './vehicle-image.entity';

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

  @Column({ length: 20, default: 'Disponible' })
  estado: string;

  @Column({ nullable: true })
  bodega_id: number; // Este es el campo que reemplazó a 'ubicacion'
}
