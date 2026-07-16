import { Controller, Post, Get, Delete, Body, Param, Request, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { WebAuthnService } from './webauthn.service';

@Controller('auth/passkey')
export class PasskeyController {
  constructor(private readonly svc: WebAuthnService) {}

  // ── Registro / gestión (requiere sesión activa) ──
  @UseGuards(AuthGuard('jwt'))
  @Post('register/options')
  registroOpciones(@Request() req) {
    return this.svc.opcionesRegistro(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('register/verify')
  registroVerify(@Body() body: { response: any; deviceName?: string }, @Request() req) {
    if (!body?.response) throw new BadRequestException('Falta la respuesta de la passkey.');
    return this.svc.verificarRegistro(req.user.id, body.response, body.deviceName);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  listar(@Request() req) {
    return this.svc.listar(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.svc.eliminar(req.user.id, id);
  }

  // ── Login por passkey (público, con rate limit) ──
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login/options')
  loginOpciones(@Body() body: { email: string }) {
    if (!body?.email) throw new BadRequestException('Falta el correo.');
    return this.svc.opcionesLogin(body.email);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login/verify')
  loginVerify(@Body() body: { email: string; response: any }) {
    if (!body?.email || !body?.response) throw new BadRequestException('Faltan datos del login.');
    return this.svc.verificarLogin(body.email, body.response);
  }
}
