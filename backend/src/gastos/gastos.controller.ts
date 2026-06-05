import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GastosService } from './gastos.service';

@Controller('gastos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class GastosController {
  constructor(private readonly service: GastosService) {}
  @Get() findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) { return this.service.findAll(desde, hasta); }
  @Get('resumen') resumen(@Query('año') año: string, @Query('mes') mes: string) {
    return this.service.resumenPorCategoria(+año || new Date().getFullYear(), +mes || new Date().getMonth() + 1);
  }
  @Post() create(@Body() data: any, @Request() req) { return this.service.create(data, req.user.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) { return this.service.update(+id, data); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(+id); }
}
