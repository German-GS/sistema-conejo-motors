import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CajaChicaService } from './caja-chica.service';

@Controller('caja-chica')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class CajaChicaController {
  constructor(private readonly service: CajaChicaService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: any) { return this.service.create(data); }
  @Post(':id/movimiento') movimiento(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.service.registrarMovimiento(+id, data, req.user.id);
  }
  @Patch(':id/cerrar') cerrar(@Param('id') id: string) { return this.service.cerrar(+id); }
  @Post(':id/reponer') reponer(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.service.reponer(+id, body.monto, req.user.id);
  }
}
