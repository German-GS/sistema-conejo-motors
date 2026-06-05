import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GarantiasService } from './garantias.service';

@Controller('garantias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador', 'Vendedor')
export class GarantiasController {
  constructor(private readonly service: GarantiasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: any) { return this.service.create(data); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) { return this.service.update(+id, data); }
  @Post(':id/reclamo') reclamo(@Param('id') id: string, @Body() data: any) { return this.service.addReclamo(+id, data); }
  @Patch('reclamo/:id') updateReclamo(@Param('id') id: string, @Body() data: any) { return this.service.updateReclamo(+id, data); }
}
