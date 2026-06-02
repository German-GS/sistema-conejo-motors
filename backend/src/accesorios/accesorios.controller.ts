import { Controller, Get, Patch, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccesoriosService } from './accesorios.service';
import { AccesorioVehiculo } from './accesorio.entity';

@Controller('accesorios')
@UseGuards(AuthGuard('jwt'))
export class AccesoriosController {
  constructor(private readonly accesoriosService: AccesoriosService) {}

  @Get()
  findAll() {
    return this.accesoriosService.findAll();
  }

  @Get(':vehiculoId')
  findOne(@Param('vehiculoId', ParseIntPipe) vehiculoId: number) {
    return this.accesoriosService.findByVehiculo(vehiculoId);
  }

  @Patch(':vehiculoId')
  update(
    @Param('vehiculoId', ParseIntPipe) vehiculoId: number,
    @Body() data: Partial<AccesorioVehiculo>,
  ) {
    return this.accesoriosService.upsert(vehiculoId, data);
  }
}
