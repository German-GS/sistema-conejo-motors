// src/site-settings/site-settings.controller.ts
import { Controller, Get, Body, Patch, Post, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SiteSettingsService } from './site-settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';

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
   * Endpoint para subir imágenes del carrusel y assets del sitio.
   */
  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads/site',
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, `site-${unique}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadSiteImages(@UploadedFiles() files: Array<Express.Multer.File>) {
    return files.map(f => ({ url: f.path.replace(/\\/g, '/') }));
  }
}
