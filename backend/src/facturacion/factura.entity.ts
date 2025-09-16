// backend/src/facturacion/factura.entity.ts
import { Venta } from '../ventas/venta.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne } from 'typeorm';

@Entity({ name: 'facturas' })
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  clave_numerica: string;

  @Column()
  consecutivo: string;

  @Column({ type: 'text' }) // Cambiado a 'text' para compatibilidad general
  xml_enviado: string;

  @Column({ type: 'text' }) // Cambiado a 'text' para compatibilidad general
  xml_respuesta: string;

  @CreateDateColumn()
  fecha_emision: Date;
  
  // --- 👇 CORRECCIÓN AQUÍ 👇 ---
  // Se usa una función () => Venta para romper la dependencia circular
  @OneToOne(() => Venta, (venta) => venta.factura)
  venta: Venta;
}