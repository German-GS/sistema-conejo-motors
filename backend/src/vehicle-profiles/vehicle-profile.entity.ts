// backend/src/vehicle-profiles/vehicle-profile.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
// 👇 LA CORRECCIÓN ES AÑADIR LA PALABRA 'type' AQUÍ 👇
import type { VehicleCategory, Drivetrain } from '../vehicles/vehicle.entity';
import { VehicleProfileImage } from './vehicle-profile-image.entity';


@Entity({ name: 'vehicle_profiles' })
export class VehicleProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  marca: string;

  @Column({ length: 50 })
  modelo: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ type: 'int' }) 
  potencia_hp: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 }) 
  autonomia_km: number;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  capacidad_bateria_kwh: number;

  @Column({ type: 'int', nullable: true }) 
  torque_nm: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  aceleracion_0_100: number;

  @Column({ type: 'int', nullable: true })
  velocidad_maxima: number;

  @Column({
    type: 'enum',
    enum: ['Sedan', 'SUV', 'Pickup', 'Hatchback', 'Comercial', 'Urbano'],
    nullable: true,
  })
  categoria: VehicleCategory;

  @Column({ type: 'enum', enum: ['4x2', '4x4', 'AWD'], nullable: true })
  traccion: Drivetrain;

  @Column({ nullable: true })
  largo_mm: number;

  @Column({ nullable: true })
  ancho_mm: number;

  @Column({ nullable: true })
  alto_mm: number;

 @OneToMany(() => VehicleProfileImage, (image) => image.profile, {
    // --- 👇 AÑADE ESTA LÍNEA ---
    cascade: true, // Esto habilita el borrado (y guardado/actualización) en cascada
    // --- 👆 FIN DE LA LÍNEA AÑADIDA ---
    eager: true, // Mantén eager si quieres cargar las imágenes automáticamente
  })
  imagenes: VehicleProfileImage[];

  @Column({ nullable: true })
  distancia_ejes_mm: number;

  @Column({ nullable: true })
  peso_kg: number;

  @Column({ nullable: true })
  capacidad_maletero_l: number;

  @Column({ nullable: true })
  numero_pasajeros: number;

  
}
