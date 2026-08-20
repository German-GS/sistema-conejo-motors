import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HaciendaClient, ResultadoEnvio, ResultadoConsulta, EstadoHacienda } from './firma.interfaces';
import { SecretsService } from './secrets.service';
import { EmisorConfigService } from '../emisor-config.service';

/** Mapa de estado de Hacienda (SDK) → nuestro EstadoHacienda interno. */
const MAPA_ESTADO: Record<string, EstadoHacienda> = {
  aceptado: 'Aceptada',
  rechazado: 'Rechazada',
  recibido: 'Procesando',
  procesando: 'Procesando',
  error: 'Rechazada',
};

/**
 * Cliente real de Hacienda: autentica contra el IDP (OAuth2 ROPC), envía el
 * comprobante firmado a la API de recepción y consulta su estado, vía
 * @dojocoding/hacienda-sdk (cargado con `import()` dinámico — ver firmador.real.ts
 * para el porqué). Ambiente (sandbox/producción) y credenciales gobernados por
 * FACTURACION_PRODUCCION + Secret Manager — ver backend/README.md.
 */
@Injectable()
export class HaciendaClientReal implements HaciendaClient {
  private readonly logger = new Logger(HaciendaClientReal.name);
  private httpClientPromise: Promise<{ sdk: any; httpClient: any }> | null = null;

  constructor(
    private readonly secrets: SecretsService,
    private readonly emisorConfig: EmisorConfigService,
    private readonly configService: ConfigService,
  ) {}

  private esProduccion(): boolean {
    return String(this.configService.get('FACTURACION_PRODUCCION') ?? 'false').toLowerCase() === 'true';
  }

  /** Sufijo de los secretos de credenciales del IDP: -stag (pruebas) o -prod. */
  private get sufijoSecreto(): 'stag' | 'prod' {
    return this.esProduccion() ? 'prod' : 'stag';
  }

  private async construirHttpClient() {
    const sdk = await import('@dojocoding/hacienda-sdk');
    const envValue = this.esProduccion() ? sdk.Environment.Production : sdk.Environment.Sandbox;
    const envConfig = sdk.getEnvironmentConfig(envValue);
    const [contrasena, cfg] = await Promise.all([
      this.secrets.leerTexto(`facturacion-idp-pass-${this.sufijoSecreto}`),
      this.emisorConfig.get(),
    ]);
    const cedulaDigitos = (cfg.cedula || '').replace(/\D/g, '');
    const idType = cfg.tipo_identificacion === '01' ? sdk.IdType.PersonaFisica : sdk.IdType.PersonaJuridica;
    const credenciales = sdk.loadCredentials({ idType, idNumber: cedulaDigitos, password: contrasena });

    const tokenManager = new sdk.TokenManager({ envConfig });
    await tokenManager.authenticate(credenciales);

    const httpClient = new sdk.HttpClient({ envConfig, tokenManager });
    this.logger.log(`Autenticado contra Hacienda (${envValue}).`);
    return { sdk, httpClient };
  }

  private getHttpClient() {
    if (!this.httpClientPromise) {
      // Si la autenticación falla, no dejar la promesa rota en caché — permitir reintentar.
      this.httpClientPromise = this.construirHttpClient().catch((err) => {
        this.httpClientPromise = null;
        throw err;
      });
    }
    return this.httpClientPromise;
  }

  async enviar(claveNumerica: string, xmlFirmado: string): Promise<ResultadoEnvio> {
    const cfg = await this.emisorConfig.get();
    const cedulaDigitos = (cfg.cedula || '').replace(/\D/g, '');
    try {
      const { sdk, httpClient } = await this.getHttpClient();
      const respuesta = await sdk.submitDocument(httpClient, {
        clave: claveNumerica,
        fecha: new Date().toISOString(),
        emisor: { tipoIdentificacion: cfg.tipo_identificacion, numeroIdentificacion: cedulaDigitos },
        comprobanteXml: Buffer.from(xmlFirmado, 'utf8').toString('base64'),
      });
      const ok = respuesta.status === 201 || respuesta.status === 202;
      return { estado: ok ? 'Enviada' : 'Borrador', mensaje: ok ? undefined : `Hacienda respondió HTTP ${respuesta.status}` };
    } catch (err: any) {
      this.logger.error(`Envío a Hacienda falló para clave ${claveNumerica}: ${err?.message ?? err}`);
      return { estado: 'Borrador', mensaje: err?.message ?? 'Error al enviar a Hacienda' };
    }
  }

  async consultarEstado(claveNumerica: string): Promise<ResultadoConsulta> {
    const { sdk, httpClient } = await this.getHttpClient();
    const respuesta = await sdk.getStatus(httpClient, claveNumerica);
    return {
      estado: MAPA_ESTADO[respuesta.status] ?? 'Procesando',
      xmlRespuesta: respuesta.responseXml,
    };
  }
}
