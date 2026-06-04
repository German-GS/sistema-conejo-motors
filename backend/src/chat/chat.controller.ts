import {
  Controller, Get, Post, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Vendedor', 'Contador')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  /** POST /chat  { contenido } */
  @Post()
  enviar(@Body('contenido') contenido: string, @Request() req) {
    return this.svc.enviar(req.user, contenido);
  }

  /** GET /chat?limit=50  — últimos mensajes */
  @Get()
  recientes(@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.svc.recientes(limit);
  }

  /** GET /chat/poll?sinceId=123  — mensajes nuevos desde un ID */
  @Get('poll')
  poll(@Query('sinceId', new DefaultValuePipe(0), ParseIntPipe) sinceId: number) {
    return this.svc.desdeId(sinceId);
  }
}
