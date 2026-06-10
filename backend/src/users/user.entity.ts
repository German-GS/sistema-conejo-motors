// backend/src/users/user.entity.ts
import { Role } from '../roles/role.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Salario } from '../salarios/salario.entity';

@Entity({ name: 'usuarios' }) // Esto vincula la clase a la tabla 'usuarios'
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre_completo: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  password_hash: string;

  @Column({ default: true })
  activo: boolean;

  /** Cuenta de sistema (admin de arranque). Oculto en vistas de equipo. */
  @Column({ default: false })
  es_sistema: boolean;

  @Column({ unique: true, nullable: true })
  cedula: string;

  // --- AÑADIMOS ESTOS CAMPOS PARA CRÉDITOS FISCALES ---
  @Column({ default: false })
  tiene_conyuge: boolean;

  @Column({ default: 0 })
  cantidad_hijos: number;
  
  // --- 👇 CAMPOS NUEVOS AÑADIDOS 👇 ---
  @Column({ length: 100, nullable: true })
  banco: string;

  @Column({ length: 50, nullable: true })
  numero_cuenta: string;

  /** Puesto o cargo real (Gerente, Subgerente, Vendedor, etc.) */
  @Column({ length: 80, nullable: true })
  puesto: string;
  // ----------------------------------------------------

  @ManyToOne(() => Role, (role) => role.usuarios)
  rol: Role;

  @OneToMany(() => Salario, (salario) => salario.usuario)
  salarios: Salario[];
}
