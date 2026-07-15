import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GastosService } from './gastos.service';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';

@Controller('gastos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador', 'Contador')
export class GastosController {
  constructor(private readonly service: GastosService) {}
  @Get() findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) { return this.service.findAll(desde, hasta); }
  @Get('resumen') resumen(@Query('año') año: string, @Query('mes') mes: string) {
    return this.service.resumenPorCategoria(+año || new Date().getFullYear(), +mes || new Date().getMonth() + 1);
  }
  @Post() create(@Body() data: CreateGastoDto, @Request() req) { return this.service.create(data as any, req.user.id); }
  @Patch(':id') update(@Param('id') id: string, @Body() data: UpdateGastoDto) { return this.service.update(+id, data as any); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(+id); }

  @Post(':id/comprobante')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  subirComprobante(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.subirComprobante(+id, file);
  }

  @Get(':id/comprobante')
  async descargarComprobante(@Param('id') id: string, @Res() res: Response) {
    const { gasto, buffer } = await this.service.descargarComprobante(+id);
    res.setHeader('Content-Type', gasto.comprobante_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${gasto.comprobante_nombre || 'comprobante'}"`);
    res.send(buffer);
  }
}
