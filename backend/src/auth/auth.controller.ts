//                                                                                   👇 AQUÍ ESTÁ LA CORRECCIÓN 👇
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async signIn(@Body() signInDto: Record<string, any>) {
    const user = await this.authService.validateUser(
      signInDto.email,
      signInDto.contrasena,
    );
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  /** Renueva el token mientras la sesión está activa (evita el logout a mitad de uso). */
  @UseGuards(AuthGuard('jwt'))
  @Post('refresh')
  refresh(@Request() req) {
    return this.authService.refresh(req.user.id);
  }

  /**
   * Recuperación de emergencia de un Administrador (break-glass). Pública pero protegida por
   * el secreto ADMIN_RESET_SECRET (que solo conoce el dueño, en env var de Cloud Run).
   */
  @Post('recuperar-admin')
  recuperarAdmin(@Body() body: { email: string; nuevaPassword: string; secret: string }) {
    return this.authService.recuperarAdmin(body?.email, body?.nuevaPassword, body?.secret);
  }

  /** Cambio de la propia contraseña (verifica la actual). Requiere sesión activa. */
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  changePassword(@Body() body: { actual: string; nueva: string }, @Request() req) {
    return this.authService.changePassword(req.user.id, body?.actual, body?.nueva);
  }
}
