import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { EntidadFinancieraDocumento } from './entidad-financiera-documento.entity';

@Entity({ name: 'entidades_financieras' })
export class EntidadFinanciera {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @CreateDateColumn()
  fecha_creacion: Date;

  @OneToMany(() => EntidadFinancieraDocumento, (d) => d.entidad, { cascade: true, eager: true })
  documentos: EntidadFinancieraDocumento[];
}
