import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TesoreriaService } from './tesoreria.service';

@Controller('tesoreria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class TesoreriaController {
  constructor(private readonly service: TesoreriaService) {}
  @Get('cuentas') cuentas() { return this.service.findCuentas(); }
  @Get('resumen') resumen() { return this.service.resumen(); }
  @Post('cuentas') createCuenta(@Body() data: any) { return this.service.createCuenta(data); }
  @Get('cuentas/:id/movimientos') movimientos(
    @Param('id') id: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string
  ) { return this.service.findMovimientos(+id, desde, hasta); }
  @Post('cuentas/:id/movimiento') movimiento(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.service.registrarMovimiento(+id, data, req.user.id);
  }
  @Patch('movimientos/:id/conciliar') conciliar(@Param('id') id: string) { return this.service.conciliar(+id); }
  @Get('cuentas/:id/conciliacion') conciliacion(@Param('id') id: string) { return this.service.conciliacion(+id); }
}
