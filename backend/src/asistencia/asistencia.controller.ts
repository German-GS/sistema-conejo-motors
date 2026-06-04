import {
  Controller, Get, Post, Body, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AsistenciaService } from './asistencia.service';

@Controller('asistencia')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AsistenciaController {
  constructor(private readonly svc: AsistenciaService) {}

  /** POST /asistencia/marcar  { tipo: 'entrada'|'salida', ubicacion?, nota? } */
  @Post('marcar')
  @Roles('Vendedor', 'Administrador', 'Contador')
  marcar(
    @Body() body: { tipo: 'entrada' | 'salida'; ubicacion?: string; nota?: string },
    @Request() req,
  ) {
    return this.svc.marcar(req.user, body.tipo, body.ubicacion, body.nota);
  }

  /** GET /asistencia/estado-hoy */
  @Get('estado-hoy')
  @Roles('Vendedor', 'Administrador', 'Contador')
  estadoHoy(@Request() req) {
    return this.svc.estadoHoy(req.user);
  }

  /** GET /asistencia/mi-historial?startDate=&endDate= */
  @Get('mi-historial')
  @Roles('Vendedor', 'Administrador', 'Contador')
  miHistorial(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const hoy = new Date().toISOString().split('T')[0];
    return this.svc.miHistorial(req.user, startDate || hoy, endDate || hoy);
  }

  /** GET /asistencia/conectados-hoy  (todos) */
  @Get('conectados-hoy')
  @Roles('Administrador', 'Vendedor', 'Contador')
  conectadosHoy() {
    return this.svc.conectadosHoy();
  }

  /** GET /asistencia/reporte-dia?fecha=YYYY-MM-DD  (admin) */
  @Get('reporte-dia')
  @Roles('Administrador')
  reporteDia(@Query('fecha') fecha: string) {
    return this.svc.reporteDia(fecha || new Date().toISOString().split('T')[0]);
  }

  /** GET /asistencia/reporte-rango?startDate=&endDate=  (admin) */
  @Get('reporte-rango')
  @Roles('Administrador')
  reporteRango(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const hoy = new Date().toISOString().split('T')[0];
    return this.svc.reporteRango(startDate || hoy, endDate || hoy);
  }
}
