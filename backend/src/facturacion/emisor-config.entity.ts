import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Datos del emisor para la factura electrónica, editables desde Configuración.
 * Fila única (id=1). Se siembra desde las variables de entorno EMISOR_* la primera vez.
 */
@Entity({ name: 'emisor_config' })
export class EmisorConfig {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  /** Razón social legal (va en Emisor.Nombre). */
  @Column({ type: 'varchar', length: 200, default: '' })
  razon_social: string;

  /** Nombre de fantasía / comercial (Emisor.NombreComercial). */
  @Column({ type: 'varchar', length: 200, default: '' })
  nombre_comercial: string;

  /** Cédula del emisor (solo dígitos). */
  @Column({ type: 'varchar', length: 12, default: '' })
  cedula: string;

  /** 01 física, 02 jurídica, 03 DIMEX, 04 NITE. */
  @Column({ type: 'varchar', length: 2, default: '02' })
  tipo_identificacion: string;

  /** Código de actividad económica (v4.4, TRIBU-CR). */
  @Column({ type: 'varchar', length: 6, default: '' })
  actividad_economica: string;

  @Column({ type: 'varchar', length: 3, default: '001' })
  sucursal: string;

  @Column({ type: 'varchar', length: 5, default: '00001' })
  terminal: string;

  // Ubicación (códigos de provincia/cantón/distrito) + señas.
  @Column({ type: 'varchar', length: 1, default: '1' })
  provincia: string;

  @Column({ type: 'varchar', length: 2, default: '01' })
  canton: string;

  @Column({ type: 'varchar', length: 2, default: '01' })
  distrito: string;

  @Column({ type: 'varchar', length: 250, default: '' })
  otras_senas: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  telefono: string;

  @Column({ type: 'varchar', length: 120, default: '' })
  email: string;

  @UpdateDateColumn()
  actualizado_en: Date;
}
