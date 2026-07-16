import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Credencial WebAuthn (passkey) registrada por un usuario. Guarda la LLAVE PÚBLICA
 * (no hay secretos): la privada nunca sale del dispositivo del usuario.
 */
@Entity({ name: 'passkey_credentials' })
export class PasskeyCredential {
  @PrimaryGeneratedColumn()
  id: number;

  /** ID de la credencial (base64url), único. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 512 })
  credential_id: string;

  /** Llave pública (base64). */
  @Column({ type: 'text' })
  public_key: string;

  /** Contador anti-clonación (bigint como string). */
  @Column({ type: 'bigint', default: 0 })
  counter: string;

  /** Transportes soportados (coma-separados: internal, hybrid, usb, nfc, ble). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transports: string | null;

  /** Nombre amigable del dispositivo (ej. "iPhone de German"). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  usuario: User;

  @CreateDateColumn()
  creado_en: Date;
}
