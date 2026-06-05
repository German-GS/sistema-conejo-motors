import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TallerService } from './taller.service';

@Controller('taller')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador', 'Vendedor')
export class TallerController {
  constructor(private readonly service: TallerService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: any) { return this.service.create(data); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) { return this.service.update(+id, data); }
  @Post(':id/detalle') addDetalle(@Param('id') id: string, @Body() data: any) { return this.service.addDetalle(+id, data); }
  @Delete('detalle/:id') removeDetalle(@Param('id') id: string) { return this.service.removeDetalle(+id); }
}
