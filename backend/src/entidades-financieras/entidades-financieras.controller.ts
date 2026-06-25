import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe,
  UseGuards, UseInterceptors, UploadedFile, InternalServerErrorException, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { EntidadesFinancierasService } from './entidades-financieras.service';

const GCS_BUCKET = process.env.GCS_BUCKET ?? 'conejo-motors-media';
const GCS_BASE = `https://storage.googleapis.com/${GCS_BUCKET}`;
const gcsStorage = new Storage();
const bucket = gcsStorage.bucket(GCS_BUCKET);

@Controller('entidades-financieras')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EntidadesFinancierasController {
  constructor(private readonly svc: EntidadesFinancierasService) {}

  @Get()
  @Roles('Administrador')
  findAll() {
    return this.svc.findAll();
  }

  /** Para el formulario del lead (vendedor y admin) */
  @Get('activas')
  @Roles('Vendedor', 'Administrador')
  findActivas() {
    return this.svc.findActivas();
  }

  @Post('seed')
  @Roles('Administrador')
  seed() {
    return this.svc.seed();
  }

  @Post()
  @Roles('Administrador')
  create(@Body() body: { nombre: string }) {
    if (!body?.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio.');
    return this.svc.create(body.nombre);
  }

  @Patch(':id')
  @Roles('Administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @Roles('Administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  /** Sube un formulario (CIC, KYC, etc.) a la entidad. Queda público para compartir por WhatsApp. */
  @Post(':id/documentos')
  @Roles('Administrador')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('nombre') nombre: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    try {
      const ext = (file.originalname.split('.').pop() ?? 'pdf').toLowerCase();
      const filename = `entidades-financieras/${uuidv4()}.${ext}`;
      const blob = bucket.file(filename);
      await blob.save(file.buffer, { metadata: { contentType: file.mimetype }, resumable: false });
      const url = `${GCS_BASE}/${filename}`;
      return this.svc.addDocumento(id, {
        nombre: (nombre?.trim() || file.originalname),
        url,
        tipo_mime: file.mimetype,
        tamano_bytes: file.size,
      });
    } catch (err) {
      console.error('GCS upload error (entidad doc):', err);
      throw new InternalServerErrorException('Error al subir el documento.');
    }
  }

  @Delete('documentos/:docId')
  @Roles('Administrador')
  removeDocumento(@Param('docId', ParseIntPipe) docId: number) {
    return this.svc.removeDocumento(docId);
  }
}
