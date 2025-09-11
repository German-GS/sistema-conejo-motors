// src/site-settings/site-settings.controller.ts
import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
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
  // 3. AÑADIMOS LA SEGURIDAD AQUÍ TAMBIÉN
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Administrador')
  updateSettings(@Body() updateDto: UpdateSiteSettingsDto) {
    return this.settingsService.updateSettings(updateDto);
  }
}
