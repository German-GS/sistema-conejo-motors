import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Proveedor } from '../proveedores/proveedor.entity';
import { User } from '../users/user.entity';

export type GastoCategoria = 'Salarios' | 'Servicios Publicos' | 'Publicidad' | 'Combustible' | 'Alquiler' | 'Mantenimiento' | 'Papeleria' | 'Alimentacion' | 'Transporte' | 'Seguros' | 'Impuestos' | 'Otro';

@Entity({ name: 'gastos_operativos' })
export class Gasto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['Salarios', 'Servicios Publicos', 'Publicidad', 'Combustible', 'Alquiler',
      'Mantenimiento', 'Papeleria', 'Alimentacion', 'Transporte', 'Seguros', 'Impuestos', 'Otro'],
    default: 'Otro',
  })
  categoria: GastoCategoria;

  @Column({ length: 250 })
  descripcion: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 100, nullable: true })
  numero_factura?: string;

  // Método de pago: define la contrapartida contable (Efectivo→1100, Banco/Tarjeta/SINPE/
  // Transferencia→1110, Crédito→2100 CxP). Por defecto Efectivo si no se indica.
  @Column({ length: 30, nullable: true })
  metodo_pago?: string;

  // ── IVA para crédito fiscal (D-150) ───────────────────────────────────────
  /** Base imponible (sin IVA). Si 0, se asume que `monto` es la base sin IVA. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  base_imponible: number;

  /** IVA soportado (crédito fiscal). Va a la cuenta 1210. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  iva_monto: number;

  @Column({ length: 10, default: 'T13' })
  iva_tarifa: string;

  /** Clasificación del crédito: Bienes | Servicios | BienesCapital */
  @Column({ length: 20, default: 'Bienes' })
  tipo_credito: string;

  @ManyToOne(() => Proveedor, { nullable: true })
  proveedor?: Proveedor;

  @ManyToOne(() => User, { nullable: true })
  registrado_por?: User;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ default: false })
  contabilizado: boolean;

  // ── Comprobante / factura de respaldo (GCS privado) ───────────────────────
  @Column({ type: 'varchar', length: 500, nullable: true })
  comprobante_gcs_path: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comprobante_nombre: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  comprobante_mime: string | null;

  @CreateDateColumn()
  creado_en: Date;
}
