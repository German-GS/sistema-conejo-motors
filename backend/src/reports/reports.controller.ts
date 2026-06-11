// backend/src/reports/reports.controller.ts
import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request, ParseIntPipe, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ── Informes existentes ────────────────────────────────────────────────────

  @Get('summary')
  async getReport(
    @Query('type') type: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (type !== 'inventory') {
      const start = new Date(`${startDate}T00:00:00`);
      const end   = new Date(`${endDate}T23:59:59`);
      switch (type) {
        case 'detailed-sales':   return this.reportsService.getDetailedSalesReport(start, end);
        case 'profit':           return this.reportsService.getProfitReport(start, end);
        case 'sales-by-seller':  return this.reportsService.getSalesBySellerReport(start, end);
        case 'sales-by-vehicle': return this.reportsService.getSalesByVehicleReport(start, end);
        case 'payroll':          return this.reportsService.getPayrollReport(start, end);
        case 'leads-by-seller':  return this.reportsService.getLeadsBySellerReport(start, end);
        case 'most-quoted':      return this.reportsService.getMostQuotedReport(start, end);
        default:                 return { error: 'Tipo de informe no válido' };
      }
    }
    return this.reportsService.getInventoryReport();
  }

  // ── Cierre de Mes ──────────────────────────────────────────────────────────

  /** Lista todos los cierres guardados */
  @Get('cierre-mes')
  getCierres() {
    return this.reportsService.getCierres();
  }

  /** Preview de estadísticas antes de cerrar */
  @Get('cierre-mes/preview')
  preview(
    @Query('mes', ParseIntPipe) mes: number,
    @Query('anio', ParseIntPipe) anio: number,
  ) {
    return this.reportsService.getCierrePreview(mes, anio);
  }

  /** Ejecutar el cierre de mes */
  @Post('cierre-mes')
  ejecutar(
    @Body() body: { mes: number; anio: number; archivarLeads: boolean },
    @Request() req: any,
  ) {
    return this.reportsService.ejecutarCierre(
      body.mes, body.anio, req.user, body.archivarLeads ?? false,
    );
  }

  /** Descargar Excel de un cierre */
  @Get('cierre-mes/:id/excel')
  async descargarExcel(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generarExcelCierre(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cierre-mes-${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
