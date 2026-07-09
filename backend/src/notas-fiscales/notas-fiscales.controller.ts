import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotasFiscalesService } from './notas-fiscales.service';

@Controller('notas-fiscales')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class NotasFiscalesController {
  constructor(private readonly svc: NotasFiscalesService) {}

  @Get()
  listar() { return this.svc.listar(); }

  @Post()
  crear(@Body() body: any, @Request() req: any) { return this.svc.crear(body, req.user); }
}
