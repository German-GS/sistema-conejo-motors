import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ComprasService } from './compras.service';

@Controller('compras')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class ComprasController {
  constructor(private readonly service: ComprasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(+id); }
  @Post() create(@Body() data: any, @Request() req) { return this.service.create(data, req.user.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) { return this.service.update(+id, data); }
}
