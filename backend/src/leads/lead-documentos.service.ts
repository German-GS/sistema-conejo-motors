// backend/src/leads/lead-documentos.service.ts
import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { LeadDocumento } from './lead-documento.entity';
import { Lead } from './lead.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

const GCS_BUCKET = process.env.GCS_BUCKET ?? 'conejo-motors-media';
const gcsStorage = new Storage();
const bucket = gcsStorage.bucket(GCS_BUCKET);

/** Meses de retención antes del borrado automático */
const MESES_RETENCION = 2;

/** Tipos permitidos: PDF, imágenes y documentos comunes */
const MIME_PERMITIDOS = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por archivo

@Injectable()
export class LeadDocumentosService {
  private readonly logger = new Logger(LeadDocumentosService.name);

  constructor(
    @InjectRepository(LeadDocumento)
    private docsRepo: Repository<LeadDocumento>,
    @InjectRepository(Lead)
    private leadsRepo: Repository<Lead>,
    private notificationsService: NotificationsService,
  ) {}

  async listar(leadId: number): Promise<Omit<LeadDocumento, 'gcs_path' | 'lead'>[]> {
    const docs = await this.docsRepo.find({
      where: { lead: { id: leadId } },
      order: { fecha_creacion: 'DESC' },
    });
    // Nunca exponer la ruta interna de GCS al cliente
    return docs.map(({ gcs_path, lead, ...rest }) => rest) as any;
  }

  async subir(
    leadId: number,
    file: Express.Multer.File,
    usuario: User,
    actividadId?: number,
  ): Promise<LeadDocumento> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 15 MB.');
    }
    if (file.mimetype && !MIME_PERMITIDOS.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`);
    }

    const lead = await this.leadsRepo.findOneBy({ id: leadId });
    if (!lead) throw new NotFoundException(`Lead #${leadId} no encontrado.`);

    // Subir a GCS en ruta privada (sin makePublic)
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const gcsPath = `lead-documentos/${leadId}/${uuidv4()}.${ext}`;
    const blob = bucket.file(gcsPath);
    await blob.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    const fechaExpiracion = new Date();
    fechaExpiracion.setMonth(fechaExpiracion.getMonth() + MESES_RETENCION);

    const doc = this.docsRepo.create({
      nombre: file.originalname,
      gcs_path: gcsPath,
      tipo_mime: file.mimetype,
      tamano_bytes: file.size,
      fecha_expiracion: fechaExpiracion,
      actividad_id: actividadId ? Number(actividadId) : undefined,
      lead: { id: leadId } as Lead,
      subido_por: usuario,
    });
    return this.docsRepo.save(doc);
  }

  /** Retorna el buffer + metadata para que el controller lo transmita (descarga autenticada) */
  async descargar(leadId: number, docId: number): Promise<{ doc: LeadDocumento; buffer: Buffer }> {
    const doc = await this.docsRepo.findOne({
      where: { id: docId, lead: { id: leadId } },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    const [buffer] = await bucket.file(doc.gcs_path).download();
    return { doc, buffer };
  }

  async eliminar(leadId: number, docId: number, usuario: User): Promise<{ ok: boolean }> {
    const doc = await this.docsRepo.findOne({
      where: { id: docId, lead: { id: leadId } },
      relations: ['subido_por'],
    });
    if (!doc) throw new NotFoundException('Documento no encontrado.');

    // Solo el admin o quien lo subió puede borrarlo manualmente
    const esAdmin = usuario.rol?.nombre === 'Administrador';
    if (!esAdmin && doc.subido_por?.id !== usuario.id) {
      throw new ForbiddenException('No tenés permiso para eliminar este documento.');
    }

    await this._borrarBlob(doc.gcs_path);
    await this.docsRepo.delete(doc.id);
    return { ok: true };
  }

  private async _borrarBlob(gcsPath: string): Promise<void> {
    try {
      await bucket.file(gcsPath).delete({ ignoreNotFound: true });
    } catch (e) {
      this.logger.warn(`No se pudo borrar el objeto GCS ${gcsPath}: ${(e as Error).message}`);
    }
  }

  // ── CRON: aviso 7 días antes del borrado (3:00am CR = 09:00 UTC) ──────────
  @Cron('0 9 * * *', { timeZone: 'UTC' })
  async avisarProximosVencimientos(): Promise<void> {
    try {
      const en7dias = new Date();
      en7dias.setDate(en7dias.getDate() + 7);
      const hoy = new Date();
      // documentos que vencen exactamente en la ventana de los próximos 7 días
      const proximos = await this.docsRepo.find({
        where: { fecha_expiracion: Between(hoy, en7dias) },
        relations: ['lead', 'lead.vendedor_asignado'],
      });
      // Agrupar por vendedor para no spamear
      const porVendedor = new Map<number, { user: User; count: number }>();
      for (const d of proximos) {
        const v = d.lead?.vendedor_asignado;
        if (!v) continue;
        const e = porVendedor.get(v.id) ?? { user: v, count: 0 };
        e.count++;
        porVendedor.set(v.id, e);
      }
      for (const { user, count } of porVendedor.values()) {
        await this.notificationsService.createForUser(
          user,
          `🗂️ Tenés ${count} documento(s) de cliente que se eliminarán automáticamente en menos de 7 días. Descargalos si los necesitás.`,
          '/sales/leads',
        );
      }
    } catch (e) {
      this.logger.error('Error avisando vencimientos de documentos', (e as Error).message);
    }
  }

  // ── CRON: borrado automático (3:30am CR = 09:30 UTC) ──────────────────────
  @Cron('30 9 * * *', { timeZone: 'UTC' })
  async borrarVencidos(): Promise<void> {
    try {
      const vencidos = await this.docsRepo.find({
        where: { fecha_expiracion: LessThanOrEqual(new Date()) },
      });
      for (const d of vencidos) {
        await this._borrarBlob(d.gcs_path);
        await this.docsRepo.delete(d.id);
      }
      if (vencidos.length) {
        this.logger.log(`Borrado automático: ${vencidos.length} documento(s) de cliente eliminado(s).`);
      }
    } catch (e) {
      this.logger.error('Error en borrado automático de documentos', (e as Error).message);
    }
  }
}
