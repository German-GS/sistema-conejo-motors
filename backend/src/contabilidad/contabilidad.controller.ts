import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContabilidadService } from './contabilidad.service';

@Controller('contabilidad')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ContabilidadController {
  constructor(private readonly svc: ContabilidadService) {}

  // ── Plan de Cuentas ───────────────────────────────────────────────────────

  @Get('cuentas')
  getCuentas() { return this.svc.getCuentas(); }

  @Post('cuentas')
  @Roles('Administrador')
  createCuenta(@Body() body: any) { return this.svc.createCuenta(body); }

  @Patch('cuentas/:id')
  @Roles('Administrador')
  updateCuenta(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.svc.updateCuenta(id, body);
  }

  @Post('cuentas/seed')
  @Roles('Administrador')
  seedCuentas() { return this.svc.seedCuentasEstandar(); }

  // ── Asientos ──────────────────────────────────────────────────────────────

  @Get('asientos')
  getAsientos(
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
  ) { return this.svc.getAsientos(startDate, endDate); }

  @Get('asientos/:id')
  getAsiento(@Param('id', ParseIntPipe) id: number) { return this.svc.getAsiento(id); }

  @Post('asientos')
  crearAsiento(@Body() body: any, @Request() req) {
    // Solo un Administrador puede forzar un asiento dentro de un período cerrado.
    const esAdmin = req.user?.rol?.nombre === 'Administrador';
    const forzar = body?.forzar === true && esAdmin;
    return this.svc.crearAsiento(req.user, body, { forzar });
  }

  // ── Balance ───────────────────────────────────────────────────────────────

  @Get('balance')
  getBalance(
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
  ) { return this.svc.getBalance(startDate, endDate); }

  // ── Cierre Diario ─────────────────────────────────────────────────────────

  @Get('cierres')
  getCierres() { return this.svc.getCierres(); }

  @Get('cierres/preview')
  previewCierre(@Query('fecha') fecha?: string) { return this.svc.previewCierre(fecha); }

  /** GET /contabilidad/resumen-periodo?startDate=&endDate= */
  @Get('resumen-periodo')
  resumenPeriodo(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.svc.resumenPeriodo(startDate, endDate);
  }

  @Post('cierres')
  generarCierre(@Body() body: { fecha?: string; notas?: string }, @Request() req) {
    return this.svc.generarCierre(req.user, body.fecha, body.notas);
  }

  // ── Cierre de período con bloqueo (mensual/anual) ─────────────────────────

  @Get('cierres-periodo')
  listarCierresPeriodo() { return this.svc.listarCierresPeriodo(); }

  @Post('cierres-periodo')
  @Roles('Administrador')
  cerrarPeriodo(@Body() body: { periodo: string; tipo?: 'Mensual' | 'Anual' }, @Request() req) {
    return this.svc.cerrarPeriodo(req.user, body.periodo, body.tipo ?? 'Mensual');
  }

  @Post('cierres-periodo/reabrir')
  @Roles('Administrador')
  reabrirPeriodo(@Body() body: { periodo: string }) {
    return this.svc.reabrirPeriodo(body.periodo);
  }
}
