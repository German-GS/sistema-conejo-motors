// backend/src/vehicles/vehicle-image.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'vehiculo_imagenes' })
export class VehicleImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string; // La URL o ruta del archivo de la imagen

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.imagenes)
  vehicle: Vehicle;
}
