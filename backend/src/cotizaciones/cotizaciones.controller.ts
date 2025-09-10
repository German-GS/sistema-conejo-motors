import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';

@Controller('quotes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  // 👇 RUTA ESPECÍFICA PRIMERO 👇
  @Get('my')
  @Roles('Vendedor', 'Administrador')
  findMyQuotes(@Request() req) {
    return this.cotizacionesService.findMyQuotes(req.user);
  }

  // 👇 RUTA CON PARÁMETRO DESPUÉS 👇
  @Get(':id')
  @Roles('Vendedor', 'Administrador')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cotizacionesService.findOne(id);
  }

  @Post()
  @Roles('Vendedor', 'Administrador')
  create(@Body() createDto: CreateCotizacionDto, @Request() req) {
    return this.cotizacionesService.create(createDto, req.user);
  }
}
