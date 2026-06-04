import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SolicitudesService } from './solicitudes.service';

@Controller('solicitudes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SolicitudesController {
  constructor(private readonly svc: SolicitudesService) {}

  /** POST /solicitudes  — cualquier empleado */
  @Post()
  @Roles('Vendedor', 'Administrador', 'Contador')
  crear(@Body() body: any, @Request() req) {
    return this.svc.crear(req.user, body);
  }

  /** GET /solicitudes/mis  — empleado ve las suyas */
  @Get('mis')
  @Roles('Vendedor', 'Administrador', 'Contador')
  mis(@Request() req) {
    return this.svc.misSolicitudes(req.user);
  }

  /** GET /solicitudes  — admin ve todas */
  @Get()
  @Roles('Administrador')
  todas() {
    return this.svc.todas();
  }

  /** GET /solicitudes/pendientes  — admin */
  @Get('pendientes')
  @Roles('Administrador')
  pendientes() {
    return this.svc.pendientes();
  }

  /** PATCH /solicitudes/:id/resolver  — admin aprueba/rechaza */
  @Patch(':id/resolver')
  @Roles('Administrador')
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision: 'aprobada' | 'rechazada'; respuesta?: string },
    @Request() req,
  ) {
    return this.svc.resolver(id, req.user, body.decision, body.respuesta);
  }
}
