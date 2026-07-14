import { Controller, Get, Query, UseGuards, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { ReportesContablesService } from './reportes-contables.service';

@Controller('reportes-contables')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ReportesContablesController {
  constructor(
    private readonly contabilidad: ContabilidadService,
    private readonly svc: ReportesContablesService,
  ) {}

  private xlsx(res: Response, buffer: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ── Balanza de comprobación ──
  @Get('balanza')
  balanza(@Query('hasta') hasta?: string) {
    return this.contabilidad.balanzaComprobacion(hasta);
  }
  @Get('balanza/excel')
  async balanzaExcel(@Res() res: Response, @Query('hasta') hasta?: string) {
    this.xlsx(res, await this.svc.balanzaExcel(hasta), `Balanza-${hasta || 'hoy'}.xlsx`);
  }

  // ── Libro Mayor por cuenta ──
  @Get('mayor')
  mayor(@Query('codigo') codigo: string, @Query('desde') desde: string, @Query('hasta') hasta: string) {
    if (!codigo || !desde || !hasta) throw new BadRequestException('Se requiere codigo, desde y hasta.');
    return this.contabilidad.libroMayor(codigo, desde, hasta);
  }
  @Get('mayor/excel')
  async mayorExcel(@Res() res: Response, @Query('codigo') codigo: string, @Query('desde') desde: string, @Query('hasta') hasta: string) {
    if (!codigo || !desde || !hasta) throw new BadRequestException('Se requiere codigo, desde y hasta.');
    this.xlsx(res, await this.svc.libroMayorExcel(codigo, desde, hasta), `Mayor-${codigo}-${desde}_a_${hasta}.xlsx`);
  }

  // ── Libro Diario ──
  @Get('diario/excel')
  async diarioExcel(@Res() res: Response, @Query('desde') desde: string, @Query('hasta') hasta: string) {
    if (!desde || !hasta) throw new BadRequestException('Se requiere desde y hasta.');
    this.xlsx(res, await this.svc.libroDiarioExcel(desde, hasta), `Libro-Diario-${desde}_a_${hasta}.xlsx`);
  }

  // ── Antigüedad de saldos (aging) ──
  @Get('aging')
  aging(@Query('tipo') tipo: 'cxc' | 'cxp', @Query('ref') ref?: string) {
    if (tipo !== 'cxc' && tipo !== 'cxp') throw new BadRequestException("tipo debe ser 'cxc' o 'cxp'.");
    return this.svc.aging(tipo, ref);
  }
  @Get('aging/excel')
  async agingExcel(@Res() res: Response, @Query('tipo') tipo: 'cxc' | 'cxp', @Query('ref') ref?: string) {
    if (tipo !== 'cxc' && tipo !== 'cxp') throw new BadRequestException("tipo debe ser 'cxc' o 'cxp'.");
    this.xlsx(res, await this.svc.agingExcel(tipo, ref), `Aging-${tipo}-${ref || 'hoy'}.xlsx`);
  }
}
