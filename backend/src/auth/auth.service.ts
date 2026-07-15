import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Valida si el email y la contraseña son correctos
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  // Inicia sesión y genera el token
  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      rol: user.rol,
      nombre_completo: user.nombre_completo,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /** Reemite un token fresco para un usuario ya autenticado (renovación de sesión activa). */
  async refresh(userId: number) {
    // IMPORTANTE: cargar con la relación `rol`, si no el token renovado sale SIN rol y el
    // guard de roles bloquea todo con 403 tras el primer refresco de sesión.
    const user = await this.usersService.findOneByIdFull(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado.');
    const { password_hash, ...result } = user as any;
    return this.login(result);
  }

  /**
   * Recuperación de emergencia de un Administrador (break-glass): protegida por el secreto
   * ADMIN_RESET_SECRET (env var que solo conoce el dueño). Sin ese secreto configurado, no opera.
   */
  async recuperarAdmin(email: string, nuevaPassword: string, secret: string) {
    const expected = process.env.ADMIN_RESET_SECRET;
    if (!expected) throw new UnauthorizedException('La recuperación de administrador no está configurada.');
    if (!secret || secret !== expected) throw new UnauthorizedException('Secreto de recuperación inválido.');
    if (!nuevaPassword || nuevaPassword.length < 8) throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres.');
    return this.usersService.resetAdminPassword(email, nuevaPassword);
  }

  /** Cambio de la propia contraseña del usuario autenticado. */
  async changePassword(userId: number, actual: string, nueva: string) {
    return this.usersService.changeOwnPassword(userId, actual, nueva);
  }
}
