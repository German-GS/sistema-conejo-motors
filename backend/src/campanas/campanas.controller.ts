import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampanasService } from './campanas.service';
import { CreateCampanaDto } from './dto/create-campana.dto';

@Controller('campanas')
@UseGuards(AuthGuard('jwt'))
export class CampanasController {
  constructor(private readonly service: CampanasService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('activas')
  findActivas() { return this.service.findActivas(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(+id); }

  @Get(':id/metricas')
  getMetricas(@Param('id') id: string) { return this.service.getMetricas(+id); }

  @Post()
  create(@Body() dto: CreateCampanaDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(+id); }
}
