import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';

export type ImportacionEstado = 'En Transito' | 'En Puerto' | 'En Aduana' | 'Nacionalizado' | 'Entregado';

@Entity({ name: 'importaciones' })
export class Importacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  numero_referencia: string;

  @Column({ length: 200 })
  proveedor_nombre: string;

  @Column({ length: 100, nullable: true })
  pais_origen?: string;

  @Column({ length: 100, nullable: true })
  numero_factura_comercial?: string;

  @Column({ length: 100, nullable: true })
  numero_bill_lading?: string;

  @Column({ length: 100, nullable: true })
  numero_dua?: string;

  @Column({ length: 100, nullable: true })
  numero_declaracion?: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  valor_fob_total?: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  flete_total?: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  seguro_total?: number;

  @Column({ type: 'date', nullable: true })
  fecha_compra?: string;

  @Column({ type: 'date', nullable: true })
  fecha_embarque?: string;

  @Column({ type: 'date', nullable: true })
  fecha_llegada_estimada?: string;

  @Column({ type: 'date', nullable: true })
  fecha_llegada_real?: string;

  @Column({ type: 'date', nullable: true })
  fecha_nacionalizacion?: string;

  @Column({
    type: 'enum',
    enum: ['En Transito', 'En Puerto', 'En Aduana', 'Nacionalizado', 'Entregado'],
    default: 'En Transito',
  })
  estado: ImportacionEstado;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @ManyToOne(() => User, { nullable: true })
  responsable?: User;

  @OneToMany('ImportacionVehiculo', 'importacion', { cascade: true })
  vehiculos: any[];

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
