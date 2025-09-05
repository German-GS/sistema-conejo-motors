// backend/src/planilla-parametros/entities/planilla-parametro.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'parametros_planilla' })
export class PlanillaParametro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column()
  descripcion: string;

  @Column()
  tipo:
    | 'DEDUCCION_EMPLEADO'
    | 'CARGA_PATRONAL'
    | 'RENTA'
    | 'CREDITO_FISCAL'
    | 'COMISION';
}
