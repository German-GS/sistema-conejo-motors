import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity({ name: 'clientes' })
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre_completo: string;

  @Column({ unique: true, length: 20 })
  cedula: string;

  @Column({ nullable: true, length: 15 })
  telefono: string;

  @Column({ nullable: true, length: 100 })
  email: string;

  @OneToMany(() => Cotizacion, (cotizacion) => cotizacion.cliente)
  cotizaciones: Cotizacion[];
}
