import {
  Controller, Get, Post, Patch, Param, Body, Request, Query,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivosFijosService } from './activos-fijos.service';

@Controller('activos-fijos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ActivosFijosController {
  constructor(private readonly svc: ActivosFijosService) {}

  @Get()
  listar() { return this.svc.listar(); }

  @Get('reporte-fiscal')
  reporteFiscal(@Query('tasa') tasa?: string) {
    const t = tasa ? Number(tasa) : undefined;
    return this.svc.reporteFiscal(t !== undefined && !isNaN(t) ? t : undefined);
  }

  @Post()
  crear(@Body() body: any, @Request() req: any) {
    return this.svc.crear(body, req.user?.id);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.svc.actualizar(id, body);
  }

  @Patch(':id/baja')
  darDeBaja(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.svc.darDeBaja(id, req.user?.id);
  }

  @Patch(':id/vender')
  vender(@Param('id', ParseIntPipe) id: number, @Body() body: { monto: number; contrapartida?: string }, @Request() req: any) {
    return this.svc.vender(id, body.monto, body.contrapartida ?? '1110', req.user?.id);
  }
}
