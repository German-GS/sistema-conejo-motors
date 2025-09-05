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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecibosPagoService } from './recibos_pago.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('recibos-pago')
@UseGuards(AuthGuard('jwt'))
export class RecibosPagoController {
  constructor(private readonly recibosPagoService: RecibosPagoService) {}

  @Post('generate')
  @Roles('Administrador')
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
  ) {
    return this.recibosPagoService.generatePayrollForUser(
      body.userId,
      body.periodoInicio,
      body.periodoFin,
      body.comisionesGanadas,
      body.otrasDeducciones,
      body.horasExtra,
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
  @Roles('Administrador') // 👈 Solo usuarios con este rol pueden acceder
  @UseGuards(RolesGuard) // 👈 Activa la validación de roles
  remove(@Param('id') id: string, @Request() req) {
    // Pasamos el usuario del request al servicio para el log
    return this.recibosPagoService.remove(+id, req.user);
  }
}
