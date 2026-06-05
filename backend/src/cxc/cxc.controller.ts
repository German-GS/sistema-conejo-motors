import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CxcService } from './cxc.service';

@Controller('cxc')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class CxcController {
  constructor(private readonly service: CxcService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('resumen') resumen() { return this.service.resumen(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: any) { return this.service.create(data); }
  @Post(':id/pago') pago(@Param('id') id: string, @Body() data: any) { return this.service.registrarPago(+id, data); }
}
