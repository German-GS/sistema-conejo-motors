import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, UpdateDateColumn,
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Cliente } from '../clientes/cliente.entity';

export type GarantiaTipo = 'General' | 'Bateria' | 'Motor' | 'Electrico' | 'Transmision';
export type GarantiaEstado = 'Activa' | 'Vencida' | 'Anulada';

@Entity({ name: 'garantias' })
export class Garantia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vehicle, { nullable: true })
  vehiculo?: Vehicle;

  @Column({ length: 17, nullable: true })
  vin?: string;

  @ManyToOne(() => Cliente, { nullable: true })
  cliente?: Cliente;

  @Column({
    type: 'enum',
    enum: ['General', 'Bateria', 'Motor', 'Electrico', 'Transmision'],
    default: 'General',
  })
  tipo: GarantiaTipo;

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'date' })
  fecha_fin: string;

  @Column({ type: 'int', nullable: true })
  meses: number;

  @Column({ type: 'int', nullable: true })
  kilometraje_maximo?: number;

  @Column({
    type: 'enum',
    enum: ['Activa', 'Vencida', 'Anulada'],
    default: 'Activa',
  })
  estado: GarantiaEstado;

  @Column({ type: 'text', nullable: true })
  condiciones?: string;

  @OneToMany('ReclamoGarantia', 'garantia', { cascade: true })
  reclamos: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
