// src/site-settings/site-settings.controller.ts
import { Controller, Get, Body, Patch, Post, UseGuards, UseInterceptors, UploadedFiles, InternalServerErrorException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SiteSettingsService } from './site-settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const GCS_BUCKET = process.env.GCS_BUCKET ?? 'conejo-motors-media';
const GCS_BASE   = `https://storage.googleapis.com/${GCS_BUCKET}`;
const gcsStorage = new Storage();
const bucket     = gcsStorage.bucket(GCS_BUCKET);

async function uploadToGCS(file: Express.Multer.File): Promise<string> {
  const ext      = file.originalname.split('.').pop() ?? 'jpg';
  const filename = `site/${uuidv4()}.${ext}`;
  const blob     = bucket.file(filename);
  await blob.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    resumable: false,
  });
  return `${GCS_BASE}/${filename}`;
}

// 1. ELIMINAMOS LA SEGURIDAD A NIVEL DE CLASE DE AQUÍ

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly settingsService: SiteSettingsService) {}

  /**
   * Endpoint PÚBLICO para obtener todas las configuraciones.
   * La página de inicio lo usará para renderizar el carrusel y los destacados.
   */
  @Get('public') // Cambiamos la ruta para diferenciarla
  getPublicSettings() {
    return this.settingsService.getAllSettings();
  }

  /**
   * Endpoint para obtener todas las configuraciones del sitio.
   * Solo accesible para Administradores.
   */
  @Get()
  // 2. AÑADIMOS LA SEGURIDAD DIRECTAMENTE A LOS MÉTODOS PROTEGIDOS
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  /**
   * Endpoint para actualizar las configuraciones del sitio.
   * Solo accesible para Administradores.
   * @param updateDto - DTO con el array de configuraciones a actualizar.
   */
  @Patch()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  updateSettings(@Body() updateDto: UpdateSiteSettingsDto) {
    return this.settingsService.updateSettings(updateDto);
  }

  /**
   * Endpoint para subir imágenes del carrusel y assets del sitio → GCS.
   */
  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async uploadSiteImages(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files?.length) throw new InternalServerErrorException('No se recibieron archivos.');
    try {
      const urls = await Promise.all(files.map(uploadToGCS));
      return urls.map(url => ({ url }));
    } catch (err) {
      console.error('GCS site upload error:', err);
      throw new InternalServerErrorException('Error al subir imagen a GCS.');
    }
  }
}
