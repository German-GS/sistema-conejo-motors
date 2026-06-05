import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';

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

  @Column({ nullable: true, length: 15 })
  telefono_secundario?: string;

  @Column({ nullable: true, length: 100 })
  email: string;

  @Column({ length: 6, nullable: true })
  codigo_actividad_economica: string;

  // Dirección
  @Column({ nullable: true, length: 50 })
  provincia?: string;

  @Column({ nullable: true, length: 50 })
  canton?: string;

  @Column({ nullable: true, length: 50 })
  distrito?: string;

  @Column({ nullable: true, type: 'text' })
  direccion_exacta?: string;

  // Contactos secundarios (JSON array simple)
  @Column({ nullable: true, type: 'text' })
  contactos_secundarios?: string; // JSON string [{nombre, telefono, relacion}]

  @Column({ nullable: true, length: 200 })
  notas?: string;

  @CreateDateColumn()
  creado_en?: Date;

  @OneToMany(() => Cotizacion, (cotizacion) => cotizacion.cliente)
  cotizaciones: Cotizacion[];
}
