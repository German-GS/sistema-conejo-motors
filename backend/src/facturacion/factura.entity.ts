// backend/src/facturacion/factura.entity.ts
import { Venta } from '../ventas/venta.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, UpdateDateColumn } from 'typeorm';

export type FacturaStatus = 'Procesando' | 'Aceptada' | 'Rechazada' | 'Error';

@Entity({ name: 'facturas' })
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  // Clave única de 50 dígitos que identifica el comprobante
  @Column({ unique: true, length: 50 })
  clave_numerica: string;

  // Consecutivo de Hacienda
  @Column({ unique: true, length: 20 })
  consecutivo: string;

  @Column({
    type: 'enum',
    enum: ['Procesando', 'Aceptada', 'Rechazada', 'Error'],
    default: 'Procesando',
  })
  estado: FacturaStatus;

  // XML firmado que se envió a Hacienda (codificado en Base64 o como texto)
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