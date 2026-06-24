// backend/src/leads/lead-documentos.controller.ts
import {
  Controller, Get, Post, Delete, Param, ParseIntPipe,
  UseGuards, UseInterceptors, UploadedFile, Request, Res, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LeadDocumentosService } from './lead-documentos.service';

@Controller('leads/:id/documentos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadDocumentosController {
  constructor(private readonly svc: LeadDocumentosService) {}

  /** GET /leads/:id/documentos — lista de documentos del lead */
  @Get()
  @Roles('Vendedor', 'Administrador')
  listar(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listar(id);
  }

  /** POST /leads/:id/documentos — subir un documento */
  @Post()
  @Roles('Vendedor', 'Administrador')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  subir(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('actividadId') actividadId: string,
    @Request() req,
  ) {
    return this.svc.subir(id, file, req.user, actividadId ? +actividadId : undefined);
  }

  /** GET /leads/:id/documentos/:docId/descargar — descarga autenticada (stream) */
  @Get(':docId/descargar')
  @Roles('Vendedor', 'Administrador')
  async descargar(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Res() res: Response,
  ) {
    const { doc, buffer } = await this.svc.descargar(id, docId);
    res.set({
      'Content-Type': doc.tipo_mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.nombre)}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  /** DELETE /leads/:id/documentos/:docId — eliminar manualmente */
  @Delete(':docId')
  @Roles('Vendedor', 'Administrador')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Request() req,
  ) {
    return this.svc.eliminar(id, docId, req.user);
  }
}
