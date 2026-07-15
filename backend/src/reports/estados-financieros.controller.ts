import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EstadosFinancierosService } from './estados-financieros.service';
import { SaludFinancieraService } from './salud-financiera.service';

@Controller('estados-financieros')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class EstadosFinancierosController {
  constructor(
    private readonly svc: EstadosFinancierosService,
    private readonly salud: SaludFinancieraService,
  ) {}

  @Get('salud-financiera')
  saludFinanciera(@Query('periodo') periodo: string, @Query('comparar') comparar?: string) {
    return this.salud.analizar(periodo, comparar !== 'false');
  }

  @Get('estado-resultados')
  estadoResultados(@Query('periodo') periodo: string, @Query('comparar') comparar?: string) {
    return this.svc.estadoResultados(periodo, comparar !== 'false');
  }

  @Get('balance-general')
  balanceGeneral(@Query('periodo') periodo: string, @Query('comparar') comparar?: string) {
    return this.svc.balanceGeneral(periodo, comparar !== 'false');
  }

  @Get('flujo-caja')
  flujoCaja(@Query('periodo') periodo: string, @Query('comparar') comparar?: string) {
    return this.svc.flujoCaja(periodo, comparar !== 'false');
  }

  @Get('excel')
  async excel(@Query('periodo') periodo: string, @Res() res: Response) {
    const buffer = await this.svc.excel(periodo);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Estados-Financieros-${periodo}.xlsx"`);
    res.send(buffer);
  }
}
