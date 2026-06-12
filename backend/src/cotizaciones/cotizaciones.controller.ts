import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';

@Controller('quotes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get()
  @Roles('Administrador')
  findAll() {
    return this.cotizacionesService.findAll();
  }

  /** Alertas de cotizaciones próximas a vencer (24-48 h) — para dashboard */
  @Get('alertas/vencimiento')
  @Roles('Vendedor', 'Administrador')
  getAlertas() {
    return this.cotizacionesService.getAlertasVencimiento();
  }

  @Get('my')
  @Roles('Vendedor', 'Administrador')
  findMyQuotes(@Request() req) {
    return this.cotizacionesService.findMyQuotes(req.user);
  }

  @Get(':id')
  @Roles('Vendedor', 'Administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cotizacionesService.findOne(id);
  }

  @Post()
  @Roles('Vendedor', 'Administrador')
  create(@Body() createDto: CreateCotizacionDto, @Request() req) {
    return this.cotizacionesService.create(createDto, req.user);
  }

  /** Cancela una cotización activa y libera el vehículo (admin y vendedor) */
  @Patch(':id/cancelar')
  @Roles('Vendedor', 'Administrador')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo: string },
  ) {
    return this.cotizacionesService.cancelarCotizacion(id, body.motivo ?? '');
  }

  /** Admin: extiende la reserva de una cotización por N días */
  @Patch(':id/extender')
  @Roles('Administrador')
  extender(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { dias: number },
  ) {
    return this.cotizacionesService.extenderReserva(id, body.dias ?? 4);
  }

  /** Elimina permanentemente una cotización Cancelada (solo admin) */
  @Delete(':id')
  @Roles('Administrador')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.cotizacionesService.eliminarCotizacion(id);
  }
}
