import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Importacion } from './importacion.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity({ name: 'importacion_vehiculos' })
export class ImportacionVehiculo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Importacion, (imp) => imp.vehiculos, { onDelete: 'CASCADE' })
  importacion: Importacion;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  vehiculo?: Vehicle;

  @Column({ length: 17, nullable: true })
  vin?: string;

  @Column({ length: 50, nullable: true })
  marca?: string;

  @Column({ length: 50, nullable: true })
  modelo?: string;

  @Column({ type: 'int', nullable: true })
  anio?: number;

  @Column({ length: 30, nullable: true })
  color?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  valor_fob?: number;

  // Costo total estimado en colones (base para precio_costo al promover a inventario)
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costo_estimado_crc?: number;
}
