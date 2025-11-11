// NUEVO ARCHIVO: src/vehicle-profiles/vehicle-profile-image.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { VehicleProfile } from './vehicle-profile.entity';
import type { VehicleCategory, Drivetrain } from '../vehicles/vehicle.entity';

@Entity({ name: 'vehicle_profile_images' })
export class VehicleProfileImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => VehicleProfile, (profile) => profile.imagenes)
  profile: VehicleProfile;
}