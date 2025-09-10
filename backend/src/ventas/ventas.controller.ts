import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Controller('sales')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Roles('Vendedor', 'Administrador')
  create(@Body() createVentaDto: CreateVentaDto, @Request() req) {
    return this.ventasService.create(createVentaDto, req.user);
  }
}
