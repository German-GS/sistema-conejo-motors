import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TipoCambio } from './tipo-cambio.entity';

// API pública de Hacienda (sin credenciales) con el TC del dólar del día.
const HACIENDA_TC_URL = 'https://api.hacienda.go.cr/indicadores/tc/dolar';

@Injectable()
export class TipoCambioService {
  private readonly logger = new Logger(TipoCambioService.name);

  constructor(
    @InjectRepository(TipoCambio) private repo: Repository<TipoCambio>,
    private readonly http: HttpService,
  ) {}

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
  }

  /** Guarda/actualiza el TC de una fecha (carga manual o desde una fuente). */
  async set(fecha: string, compra: number, venta: number, fuente = 'Manual'): Promise<TipoCambio> {
    const row = (await this.repo.findOneBy({ fecha })) ?? this.repo.create({ fecha });
    row.compra = compra; row.venta = venta; row.fuente = fuente;
    return this.repo.save(row);
  }

  /** TC de venta para una fecha: el de esa fecha o el más reciente anterior. */
  async getVenta(fecha?: string): Promise<number> {
    const f = fecha ?? this.hoy();
    const exacto = await this.repo.findOneBy({ fecha: f });
    if (exacto && Number(exacto.venta) > 0) return Number(exacto.venta);
    const prev = await this.repo.findOne({ where: { fecha: LessThanOrEqual(f) }, order: { fecha: 'DESC' } });
    return prev ? Number(prev.venta) : 0;
  }

  async listar(limit = 60): Promise<TipoCambio[]> {
    return this.repo.find({ order: { fecha: 'DESC' }, take: limit });
  }

  /**
   * Consulta el TC del día en la API de Hacienda y lo cachea. Si falla, no rompe:
   * devuelve el último cacheado (fallback a carga manual).
   */
  async sincronizarHoy(): Promise<TipoCambio | null> {
    const f = this.hoy();
    try {
      const { data } = await firstValueFrom(this.http.get(HACIENDA_TC_URL, { timeout: 8000 }));
      const compra = Number(data?.compra?.valor ?? data?.dolar?.compra?.valor);
      const venta = Number(data?.venta?.valor ?? data?.dolar?.venta?.valor);
      if (Number.isFinite(venta) && venta > 0) {
        return this.set(f, Number.isFinite(compra) ? compra : venta, venta, 'Hacienda');
      }
      this.logger.warn('Respuesta de Hacienda sin valor de venta válido.');
    } catch (e) {
      this.logger.warn(`No se pudo obtener el TC de Hacienda: ${(e as Error).message}. Se usa el último cacheado.`);
    }
    return this.repo.findOne({ where: { fecha: LessThanOrEqual(f) }, order: { fecha: 'DESC' } });
  }
}
