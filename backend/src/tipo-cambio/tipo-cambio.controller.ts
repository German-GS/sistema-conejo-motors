import { Controller, Get, Post, Body, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoCambioService } from './tipo-cambio.service';
import { DiferencialCambiarioService } from './diferencial-cambiario.service';

@Controller('tipo-cambio')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class TipoCambioController {
  constructor(
    private readonly svc: TipoCambioService,
    private readonly diferencial: DiferencialCambiarioService,
  ) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Get('actual')
  @Roles('Administrador', 'Contador', 'Vendedor') // lectura del TC para la vista previa de cotizaciones
  async actual(@Query('fecha') fecha?: string) {
    return { fecha: fecha ?? null, venta: await this.svc.getVenta(fecha) };
  }

  /** Sincroniza el TC de hoy desde la API de Hacienda. */
  @Post('sincronizar')
  sincronizar() {
    return this.svc.sincronizarHoy();
  }

  /** Carga manual del TC de una fecha. */
  @Post()
  set(@Body() body: { fecha: string; compra?: number; venta: number }) {
    if (!body?.fecha || !body?.venta) throw new BadRequestException('Se requiere fecha y venta.');
    return this.svc.set(body.fecha, Number(body.compra) || Number(body.venta), Number(body.venta), 'Manual');
  }

  /** Corre la revaluación del diferencial cambiario de un período. */
  @Post('revaluar')
  revaluar(@Body() body: { periodo: string; tipoCambio?: number }, @Request() req) {
    if (!body?.periodo) throw new BadRequestException('Se requiere periodo (YYYY-MM).');
    return this.diferencial.revaluarPeriodo(req.user, body.periodo, body.tipoCambio);
  }
}
