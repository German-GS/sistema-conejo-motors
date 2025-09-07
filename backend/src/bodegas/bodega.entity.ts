import { Vehicle } from '../vehicles/vehicle.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity({ name: 'bodegas' })
export class Bodega {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.bodega)
  vehiculos: Vehicle[];
}
