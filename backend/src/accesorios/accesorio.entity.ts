import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

export type EstadoAccesorio = '✅' | '❌' | '🔲';

@Entity({ name: 'accesorios_vehiculo' })
export class AccesorioVehiculo {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn()
  vehiculo: Vehicle;

  @Column({ nullable: true })
  color_interior: string;

  @Column({ nullable: true })
  observaciones: string;

  // --- ACCESORIOS ---
  @Column({ nullable: true })
  cargador_pared: string;

  @Column({ nullable: true })
  extension_cargador: string;

  @Column({ nullable: true })
  triangulos_seguridad: string;

  @Column({ nullable: true })
  manuales: string;

  @Column({ nullable: true })
  llave_control: string;

  @Column({ nullable: true })
  gas_inflar_llantas: string;

  @Column({ nullable: true })
  compresor_llantas: string;

  @Column({ nullable: true })
  llave_ruedas: string;

  @Column({ nullable: true })
  set_escobillas: string;

  @Column({ nullable: true })
  filtro_polen: string;

  @Column({ default: false })
  entregado_al_cliente: boolean;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
