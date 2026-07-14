import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmisorConfig } from './emisor-config.entity';

/**
 * Provee y persiste los datos del emisor. La primera vez siembra la fila desde las
 * variables de entorno EMISOR_* (retrocompatibilidad). Luego se edita desde la UI.
 */
@Injectable()
export class EmisorConfigService {
  constructor(
    @InjectRepository(EmisorConfig) private readonly repo: Repository<EmisorConfig>,
    private readonly config: ConfigService,
  ) {}

  async get(): Promise<EmisorConfig> {
    let row = await this.repo.findOneBy({ id: 1 });
    if (!row) {
      row = this.repo.create({
        id: 1,
        razon_social: this.config.get('EMISOR_NOMBRE') ?? '',
        nombre_comercial: this.config.get('EMISOR_NOMBRE_COMERCIAL') ?? '',
        cedula: (this.config.get<string>('EMISOR_CEDULA') ?? '').replace(/\D/g, ''),
        tipo_identificacion: this.config.get('EMISOR_TIPO_IDENTIFICACION') ?? '02',
        actividad_economica: this.config.get('EMISOR_ACTIVIDAD') ?? '',
        provincia: this.config.get('EMISOR_PROVINCIA') ?? '1',
        canton: this.config.get('EMISOR_CANTON') ?? '01',
        distrito: this.config.get('EMISOR_DISTRITO') ?? '01',
        otras_senas: this.config.get('EMISOR_DIRECCION') ?? '',
        telefono: this.config.get('EMISOR_TELEFONO') ?? '',
        email: this.config.get('EMISOR_EMAIL') ?? '',
      });
      row = await this.repo.save(row);
    }
    return row;
  }

  async update(dto: Partial<EmisorConfig>): Promise<EmisorConfig> {
    const row = await this.get();
    const campos: (keyof EmisorConfig)[] = [
      'razon_social', 'nombre_comercial', 'cedula', 'tipo_identificacion', 'actividad_economica',
      'sucursal', 'terminal', 'provincia', 'canton', 'distrito', 'otras_senas', 'telefono', 'email',
    ];
    for (const c of campos) {
      if (dto[c] !== undefined && dto[c] !== null) {
        (row as any)[c] = c === 'cedula' ? String(dto[c]).replace(/\D/g, '') : dto[c];
      }
    }
    return this.repo.save(row);
  }
}
