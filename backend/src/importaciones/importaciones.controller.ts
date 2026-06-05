import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImportacionesService } from './importaciones.service';

@Controller('importaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ImportacionesController {
  constructor(private readonly service: ImportacionesService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: any) { return this.service.create(data); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) { return this.service.update(+id, data); }

  @Post(':id/vehiculos')
  addVehiculo(@Param('id') id: string, @Body() data: any) {
    return this.service.addVehiculo(+id, data);
  }

  @Delete('vehiculos/:id')
  removeVehiculo(@Param('id') id: string) { return this.service.removeVehiculo(+id); }
}
