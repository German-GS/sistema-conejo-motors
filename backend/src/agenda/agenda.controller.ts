import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AgendaService } from './agenda.service';
import { Cita } from './cita.entity';

@Controller('agenda')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get()
  findAll(@Query('userId') userId?: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.findAll(userId ? +userId : undefined, desde, hasta);
  }

  @Get('proximas')
  proximas(@Request() req) {
    return this.service.findProximas(req.user.id);
  }

  @Get('pendientes-hoy')
  pendientesHoy(@Request() req) {
    return this.service.getPendientesHoy(req.user.id);
  }

  @Post()
  create(@Body() data: Partial<Cita>, @Request() req) {
    if (!data.asignado_a) data.asignado_a = { id: req.user.id } as any;
    return this.service.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Cita>) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
