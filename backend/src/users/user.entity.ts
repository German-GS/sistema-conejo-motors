// backend/src/users/user.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  // La relación con los roles la añadiremos más tarde
  // @Column()
  // rol_id: number;

  @Column({ default: true })
  activo: boolean;
}
