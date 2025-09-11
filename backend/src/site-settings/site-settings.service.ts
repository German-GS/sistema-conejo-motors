import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting } from './site-setting.entity';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';

@Injectable()
export class SiteSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(SiteSetting)
    private settingsRepository: Repository<SiteSetting>,
  ) {}

  /**
   * Este método se ejecuta una vez que el módulo ha sido inicializado.
   * Se asegura de que las configuraciones por defecto existan en la base de datos.
   */
  async onModuleInit() {
    const defaultSettings = [
      { key: 'carousel_slides', value: '[]' },
      { key: 'featured_vehicles', value: '[]' },
    ];

    for (const setting of defaultSettings) {
      const exists = await this.settingsRepository.findOneBy({
        key: setting.key,
      });
      if (!exists) {
        await this.settingsRepository.save(setting);
      }
    }
  }

  /**
   * Obtiene todas las configuraciones del sitio.
   * @returns Un array con todas las configuraciones.
   */
  async getAllSettings(): Promise<SiteSetting[]> {
    return this.settingsRepository.find();
  }

  /**
   * Actualiza una o más configuraciones del sitio.
   * @param dto - El DTO que contiene un array de configuraciones a actualizar.
   */
  async updateSettings(dto: UpdateSiteSettingsDto): Promise<void> {
    // Usamos Promise.all para ejecutar todas las actualizaciones en paralelo para mayor eficiencia.
    const updatePromises = dto.settings.map((setting) =>
      this.settingsRepository.save(setting),
    );
    await Promise.all(updatePromises);
  }
}
