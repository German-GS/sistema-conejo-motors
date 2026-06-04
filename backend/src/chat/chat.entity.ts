import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'chat_mensajes' })
export class ChatMensaje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  contenido: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  remitente: User;

  @CreateDateColumn()
  fecha_hora: Date;
}
