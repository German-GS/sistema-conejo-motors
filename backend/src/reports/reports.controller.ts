import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getReport(
    @Query('type') type: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Si el reporte no es de inventario, procesamos las fechas
    if (type !== 'inventory') {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // --- 👇 LA CORRECCIÓN CLAVE ESTÁ AQUÍ 👇 ---
      // Nos aseguramos de que la fecha final cubra el día completo
      end.setHours(23, 59, 59, 999);

      switch (type) {
        case 'detailed-sales':
          return this.reportsService.getDetailedSalesReport(start, end);
        case 'profit':
          return this.reportsService.getProfitReport(start, end);
        case 'sales-by-seller':
          return this.reportsService.getSalesBySellerReport(start, end);
        case 'sales-by-vehicle':
          return this.reportsService.getSalesByVehicleReport(start, end);
        default:
          return { error: 'Tipo de informe no válido' };
      }
    }

    // Si el tipo es 'inventory', no necesita fechas
    if (type === 'inventory') {
      return this.reportsService.getInventoryReport();
    }
  }
}
