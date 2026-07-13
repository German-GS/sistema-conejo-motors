// backend/src/facturacion/factura.entity.ts
import { Venta } from '../ventas/venta.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, UpdateDateColumn } from 'typeorm';

// Máquina de estados: Borrador → Firmada → Enviada → Aceptada | Rechazada.
// En modo interino (sin llaves) el flujo se detiene en 'Borrador'.
// 'Procesando'/'Error' se conservan por compatibilidad con datos existentes.
export type FacturaStatus =
  | 'Borrador'
  | 'Firmada'
  | 'Enviada'
  | 'Aceptada'
  | 'Rechazada'
  | 'Procesando'
  | 'Error';

@Entity({ name: 'facturas' })
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  // Clave numérica de 50 dígitos que identifica el comprobante.
  // En modo interino es PROVISIONAL (no consume el consecutivo oficial).
  @Column({ unique: true, length: 50 })
  clave_numerica: string;

  // Consecutivo de Hacienda (20). En modo interino es PROVISIONAL.
  @Column({ unique: true, length: 20 })
  consecutivo: string;

  @Column({ type: 'varchar', length: 20, default: 'Borrador' })
  estado: FacturaStatus;

  /**
   * false mientras el comprobante no esté firmado y aceptado por Hacienda.
   * Un comprobante con valido_fiscalmente=false NO respalda IVA ni se entrega
   * como factura legal al cliente.
   */
  @Column({ default: false })
  valido_fiscalmente: boolean;

  /** Código de seguridad (8) usado en la clave. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  codigo_seguridad: string | null;

  /** Situación del comprobante: 1 normal / 2 contingencia / 3 sin internet. */
  @Column({ type: 'varchar', length: 1, default: '1' })
  situacion: string;

  /** true = clave/consecutivo son provisionales (aún no se consumió la secuencia oficial). */
  @Column({ default: true })
  numeracion_provisional: boolean;

  // XML enviado a Hacienda (en interino: XML del borrador SIN firmar).
  @Column({ type: 'text' })
  xml_enviado: string;

  // XML de respuesta de Hacienda (codificado en Base64 o como texto)
  @Column({ type: 'text', nullable: true })
  xml_respuesta: string;

  // Campo para guardar mensajes de error de la API
  @Column({ type: 'text', nullable: true })
  error_mensaje?: string;

  @CreateDateColumn()
  fecha_emision: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @OneToOne(() => Venta, (venta) => venta.factura)
  venta: Venta;
}