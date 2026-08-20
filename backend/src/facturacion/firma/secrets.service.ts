import { Injectable, Logger } from '@nestjs/common';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'conejo-motors';

/**
 * Lee secretos de Google Secret Manager (llave .p12, su PIN, credenciales del
 * IDP de Hacienda) con caché en memoria — se leen una sola vez por arranque
 * del contenedor, no en cada factura.
 */
@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly client = new SecretManagerServiceClient();
  private readonly cache = new Map<string, Buffer>();

  private async leer(nombre: string): Promise<Buffer> {
    const cacheado = this.cache.get(nombre);
    if (cacheado) return cacheado;
    const [version] = await this.client.accessSecretVersion({
      name: `projects/${GCP_PROJECT}/secrets/${nombre}/versions/latest`,
    });
    const data = version.payload?.data;
    if (!data) throw new Error(`Secreto "${nombre}" está vacío o no existe.`);
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
    this.cache.set(nombre, buf);
    this.logger.log(`Secreto "${nombre}" cargado desde Secret Manager.`);
    return buf;
  }

  async leerBuffer(nombre: string): Promise<Buffer> {
    return this.leer(nombre);
  }

  async leerTexto(nombre: string): Promise<string> {
    return (await this.leer(nombre)).toString('utf8');
  }
}
