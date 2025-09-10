import { User } from '../users/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => User, { eager: true }) // Carga el usuario para saber quién la lee
  user: User;

  @Column({ nullable: true })
  link?: string; // Enlace opcional para ir a la venta, cotización, etc.

  @CreateDateColumn()
  createdAt: Date;
}
