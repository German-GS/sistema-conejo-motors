// backend/src/recibos_pago/recibos_pago.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Request,
  Delete,
  // --- 👇 INICIO DE LA MODIFICACIÓN: AÑADIR NUEVOS IMPORTS 👇 ---
  Query,
  ParseIntPipe,
  BadRequestException,
  // --- 👆 FIN DE LA MODIFICACIÓN 👆 ---
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecibosPagoService } from './recibos_pago.service';
import { PlanillaCalculationService } from './planilla-calculation.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('recibos-pago')
@UseGuards(AuthGuard('jwt'))
export class RecibosPagoController {
  constructor(
    private readonly recibosPagoService: RecibosPagoService,
    private readonly calculationService: PlanillaCalculationService,
  ) {}

  /** Convierte entre salario bruto y neto para el formulario de empleado */
  @Post('convertir-salario')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  convertirSalario(
    @Body() body: { modo: 'bruto' | 'neto'; monto: number; tiene_conyuge?: boolean; cantidad_hijos?: number },
  ) {
    if (!body?.monto || body.monto <= 0) {
      throw new BadRequestException('Ingresá un monto válido.');
    }
    const modo = body.modo === 'neto' ? 'neto' : 'bruto';
    return this.calculationService.convertirSalario(modo, body.monto, {
      tiene_conyuge: body.tiene_conyuge,
      cantidad_hijos: body.cantidad_hijos,
    });
  }

  // --- 👇 INICIO DE LA MODIFICACIÓN: AÑADIR NUEVA FUNCIÓN COMPLETA 👇 ---
  @Get('calculate-commissions')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  calculateCommissions(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    console.log('---[ Controller: calculateCommissions ]---');
    console.log('Parámetros recibidos:', { userId, startDate, endDate });
    if (!userId || !startDate || !endDate) {
      throw new BadRequestException('Faltan parámetros requeridos.');
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    console.log('Fechas convertidas para el servicio:', { start, end });
    console.log('------------------------------------------');
    return this.recibosPagoService.calculateCommissionsForPeriod(
      userId,
      start,
      end,
    );
  }
  // --- 👆 FIN DE LA MODIFICACIÓN 👆 ---

  @Post('generate')
  @Roles('Administrador')
  @UseGuards(RolesGuard) // Es una buena práctica añadir el RolesGuard aquí también
  generatePayroll(
    @Body()
    body: {
      userId: number;
      periodoInicio: string;
      periodoFin: string;
      comisionesGanadas?: number;
      otrasDeducciones?: number;
      horasExtra?: number;
    },
    @Request() req,
  ) {
    return this.recibosPagoService.generatePayrollForUser(
      body.userId,
      body.periodoInicio,
      body.periodoFin,
      body.comisionesGanadas,
      body.otrasDeducciones,
      body.horasExtra,
      req.user,
    );
  }

  @Get(':id/desglose')
  getDesglose(@Param('id') id: string) {
    return this.recibosPagoService.getDesglose(+id);
  }

  @Get()
  findAll() {
    return this.recibosPagoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recibosPagoService.findOne(+id);
  }

  @Delete(':id')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.recibosPagoService.remove(+id, req.user);
  }
}
