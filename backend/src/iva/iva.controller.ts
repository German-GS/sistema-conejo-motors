import {
  Controller, Get, Post, Patch, Param, Body, Query, Request,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IvaService } from './iva.service';

@Controller('iva')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class IvaController {
  constructor(private readonly svc: IvaService) {}

  @Get('liquidaciones')
  listar() { return this.svc.listar(); }

  @Get('pendiente')
  pendiente() { return this.svc.pendienteActual(); }

  @Get('preview')
  preview(@Query('periodo') periodo: string, @Query('retenciones') ret?: string) {
    return this.svc.preview(periodo, ret ? Number(ret) : undefined);
  }

  @Post('generar')
  @Roles('Administrador', 'Contador')
  generar(@Body() body: { periodo: string; retenciones?: number; notas?: string }, @Request() req: any) {
    return this.svc.generar(req.user, body.periodo, Number(body.retenciones) || 0, body.notas);
  }

  @Patch(':id/presentada')
  presentada(@Param('id', ParseIntPipe) id: number) { return this.svc.marcarPresentada(id); }

  @Patch(':id/pagada')
  pagada(@Param('id', ParseIntPipe) id: number, @Body() body: { cuentaBanco?: string }, @Request() req: any) {
    return this.svc.marcarPagada(id, req.user, body?.cuentaBanco ?? '1110');
  }
}
