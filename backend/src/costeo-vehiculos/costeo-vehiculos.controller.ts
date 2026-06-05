import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CosteoVehiculosService } from './costeo-vehiculos.service';
import { CosteoVehiculo } from './costeo-vehiculo.entity';

@Controller('costeo-vehiculos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class CosteoVehiculosController {
  constructor(private readonly service: CosteoVehiculosService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':vehiculoId')
  findOne(@Param('vehiculoId') id: string) {
    return this.service.findByVehiculo(+id);
  }

  @Post(':vehiculoId')
  upsert(@Param('vehiculoId') id: string, @Body() data: Partial<CosteoVehiculo>) {
    return this.service.upsert(+id, data);
  }
}
