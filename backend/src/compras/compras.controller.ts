import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
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
  @Patch(':id') update(@Param('id') id: string, @Body() data: any, @Request() req) { return this.service.update(+id, data, req.user?.id); }

  @Post(':id/comprobante')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  subirComprobante(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.subirComprobante(+id, file);
  }

  @Get(':id/comprobante')
  async descargarComprobante(@Param('id') id: string, @Res() res: Response) {
    const { orden, buffer } = await this.service.descargarComprobante(+id);
    res.setHeader('Content-Type', orden.comprobante_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${orden.comprobante_nombre || 'comprobante'}"`);
    res.send(buffer);
  }
}
