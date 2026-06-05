import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity({ name: 'costeo_vehiculos' })
export class CosteoVehiculo {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn()
  vehiculo: Vehicle;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  valor_fob: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  flete: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  seguro: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  aranceles: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuesto_ventas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  duca_gastos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  transporte_local: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  inspeccion_rtv: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  preparacion: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  adaptaciones: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  otros: number;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
