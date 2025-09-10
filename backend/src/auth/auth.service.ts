import { Injectable, UnauthorizedException } from '@nestjs/common';
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
}
