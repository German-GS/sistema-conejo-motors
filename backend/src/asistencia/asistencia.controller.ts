import {
  Controller, Get, Post, Patch, Delete, Body, Query, Param,
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

  /** GET /asistencia/sin-salida — cierres automáticos pendientes de revisión (admin) */
  @Get('sin-salida')
  @Roles('Administrador')
  getSinSalida() {
    return this.svc.getSinSalida();
  }

  /** POST /asistencia/admin-agregar — admin registra un marcaje (ej. salida olvidada) */
  @Post('admin-agregar')
  @Roles('Administrador')
  adminAgregar(
    @Body() body: { usuarioId: number; tipo: 'entrada' | 'salida'; fecha_hora: string; nota?: string },
    @Request() req,
  ) {
    return this.svc.adminAgregarMarcaje(body.usuarioId, body.tipo, body.fecha_hora, req.user, body.nota);
  }

  /** DELETE /asistencia/:id — admin elimina un marcaje (queda en el log) */
  @Delete(':id')
  @Roles('Administrador')
  adminEliminar(@Param('id') id: string, @Request() req) {
    return this.svc.adminEliminarMarcaje(+id, req.user);
  }

  /** PATCH /asistencia/:id/corregir — admin corrige hora de un marcaje */
  @Patch(':id/corregir')
  @Roles('Administrador')
  adminCorregir(
    @Param('id') id: string,
    @Body() body: { fecha_hora: string; nota_admin: string },
    @Request() req,
  ) {
    return this.svc.adminCorregir(+id, body.fecha_hora, req.user, body.nota_admin);
  }
}
