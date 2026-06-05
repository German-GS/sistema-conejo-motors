import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { CuentaPagar } from './cuenta-pagar.entity';

@Entity({ name: 'pagos_cxp' })
export class PagoCxP {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CuentaPagar, (c) => c.pagos, { onDelete: 'CASCADE' })
  cuenta: CuentaPagar;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 100, nullable: true })
  referencia?: string;

  @Column({ length: 50, nullable: true })
  metodo_pago?: string;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @CreateDateColumn()
  creado_en: Date;
}
