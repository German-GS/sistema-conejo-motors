import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DepreciacionService } from './depreciacion.service';

@Controller('depreciacion/categorias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class DepreciacionController {
  constructor(private readonly svc: DepreciacionService) {}

  @Get()
  listar(@Query('activas') activas?: string) {
    return this.svc.listar(activas === 'true');
  }

  @Post('seed')
  seed() { return this.svc.seed(); }

  @Post()
  crear(@Body() body: any) { return this.svc.crear(body); }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.svc.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) { return this.svc.eliminar(id); }
}
