import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';

export type TipoCuenta = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Gasto';
export type ClasificacionBalance = 'Corriente' | 'NoCorriente';
export type FlujoCategoria = 'Operacion' | 'Inversion' | 'Financiamiento';

@Entity({ name: 'cuentas_contables' })
export class CuentaContable {
  @PrimaryGeneratedColumn()
  id: number;

  /** Código contable: 1100, 4100, etc. */
  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({
    type: 'enum',
    enum: ['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'],
  })
  tipo: TipoCuenta;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  /** Si false, es cuenta de grupo/encabezado (no recibe movimientos directos) */
  @Column({ default: true })
  acepta_movimientos: boolean;

  @Column({ default: true })
  activa: boolean;

  /** Clasificación NIIF para el Balance (solo Activo/Pasivo). null = sin clasificar. */
  @Column({ type: 'varchar', length: 12, nullable: true })
  clasificacion_balance: ClasificacionBalance | null;

  /** Sección del Estado de Flujo de Efectivo (método indirecto). null = efectivo o sin clasificar. */
  @Column({ type: 'varchar', length: 15, nullable: true })
  flujo_categoria: FlujoCategoria | null;

  @CreateDateColumn()
  fecha_creacion: Date;
}
