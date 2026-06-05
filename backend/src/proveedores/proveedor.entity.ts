import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

@Entity({ name: 'proveedores' })
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  cedula_juridica?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ length: 200, nullable: true })
  direccion?: string;

  @Column({ length: 100, nullable: true })
  sitio_web?: string;

  @Column({ length: 50, nullable: true })
  pais?: string;

  @Column({ length: 100, nullable: true })
  condicion_pago?: string; // e.g. "30 días neto", "Contado"

  @Column({ length: 100, nullable: true })
  contacto_nombre?: string;

  @Column({ length: 100, nullable: true })
  contacto_email?: string;

  @Column({ length: 20, nullable: true })
  contacto_telefono?: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creado_en: Date;
}
