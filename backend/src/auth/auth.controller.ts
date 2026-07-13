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
}
