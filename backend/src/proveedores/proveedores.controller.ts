import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProveedoresService } from './proveedores.service';
import { Proveedor } from './proveedor.entity';

@Controller('proveedores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: Partial<Proveedor>) { return this.service.create(data); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: Partial<Proveedor>) { return this.service.update(+id, data); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(+id); }
}
