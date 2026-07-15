import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CxpService } from './cxp.service';
import { CreateCxpDto, PagoCxpDto } from './dto/cxp.dto';

@Controller('cxp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class CxpController {
  constructor(private readonly service: CxpService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('resumen') resumen() { return this.service.resumen(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: CreateCxpDto) { return this.service.create(data); }
  @Post(':id/pago') pago(@Param('id') id: string, @Body() data: PagoCxpDto) { return this.service.registrarPago(+id, data); }
}
