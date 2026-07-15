import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, EntityManager } from 'typeorm';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { Gasto } from './gasto.entity';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { SiteSettingsService } from '../site-settings/site-settings.service';

const GCS_BUCKET = process.env.GCS_BUCKET ?? 'conejo-motors-media';
const bucket = new Storage().bucket(GCS_BUCKET);
const MIME_COMPROBANTE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_BYTES = 15 * 1024 * 1024;

// Mapa categoría de gasto → código de cuenta contable de gasto.
// Incluye categorías del negocio (concesionaria EV + taller) y las históricas.
const CUENTA_POR_CATEGORIA: Record<string, string> = {
  // Negocio
  'Insumos de Taller': '5400',
  'Herramientas y Equipo': '5400',
  Repuestos: '5200',              // Costo de Ventas — Repuestos
  Combustible: '5400',
  'Mantenimiento Instalaciones': '5400',
  Limpieza: '5400',
  'Publicidad y Marketing': '5500',
  'Salarios y Planilla': '5300',
  'Servicios Publicos': '5400',
  Alquiler: '5400',
  'Papeleria y Oficina': '5400',
  'Software y Tecnologia': '5400',
  Alimentacion: '5400',
  'Transporte y Logistica': '5400',
  Seguros: '5400',
  'Impuestos y Legales': '5400',
  'Comisiones y Bancarios': '5600', // Gastos Financieros
  Capacitacion: '5400',
  Otro: '5700',
  // Compatibilidad con categorías históricas
  Salarios: '5300',
  Publicidad: '5500',
  Papeleria: '5400',
  Mantenimiento: '5400',
  Impuestos: '5400',
  Transporte: '5400',
};

@Injectable()
export class GastosService {
  private readonly logger = new Logger(GastosService.name);

  constructor(
    @InjectRepository(Gasto) private repo: Repository<Gasto>,
    private readonly contabilidad: ContabilidadService,
    private readonly settings: SiteSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  /** ¿El gasto lo pagó el dueño de su bolsillo (aporte del socio)? */
  private esAporteSocio(metodo?: string): boolean {
    const m = (metodo ?? '').toLowerCase();
    return m.includes('socio') || m.includes('aporte') || m.includes('dueñ') || m.includes('duen');
  }

  /** Contrapartida contable según el método de pago del gasto (para métodos NO socio). */
  private codigoContrapartida(metodo?: string): string {
    switch ((metodo ?? 'Efectivo').toLowerCase()) {
      case 'credito':
      case 'crédito':
        return '2100'; // Cuentas por Pagar (gasto a crédito)
      case 'banco':
      case 'tarjeta':
      case 'sinpe':
      case 'transferencia':
      case 'cheque':
        return '1110'; // Banco
      default:
        return '1100'; // Caja (efectivo)
    }
  }

  findAll(desde?: string, hasta?: string): Promise<Gasto[]> {
    const where: any = {};
    if (desde && hasta) where.fecha = Between(desde, hasta);
    return this.repo.find({ where, relations: ['proveedor', 'registrado_por'], order: { fecha: 'DESC' } });
  }

  async create(data: Partial<Gasto>, userId: number): Promise<any> {
    // Atómico: el gasto y su asiento se guardan (o se revierten) juntos.
    return this.dataSource.transaction(async (manager) => {
      const g = manager.getRepository(Gasto).create({ ...data, registrado_por: { id: userId } as any, contabilizado: false });
      const saved = await manager.getRepository(Gasto).save(g);
      await this._registrarAsiento(saved, userId, manager);
      return manager.getRepository(Gasto).findOneBy({ id: saved.id });
    });
  }

  /**
   * Asiento de partida doble del gasto: Debe cuenta de gasto / Haber contrapartida (según método).
   * Si el plan de cuentas no está inicializado, deja el gasto como no contabilizado (pendiente).
   * Cualquier error de posteo propaga para que la transacción revierta todo.
   */
  private async _registrarAsiento(gasto: Gasto, userId?: number, manager?: EntityManager): Promise<void> {
    const monto = Number(gasto.monto) || 0;
    if (monto <= 0) return;

    const codigoGasto = CUENTA_POR_CATEGORIA[gasto.categoria] ?? '5700';
    const cuentaGasto = await this.contabilidad.asegurarCuenta(codigoGasto, { nombre: 'Gasto', tipo: 'Gasto' });

    // Si lo pagó el dueño (aporte del socio) → la contrapartida es la cuenta puente del
    // setting, que el usuario crea manualmente (se valida su existencia, no se crea).
    let cuentaContra;
    let codigoContra: string;
    if (this.esAporteSocio(gasto.metodo_pago)) {
      codigoContra = await this.settings.getValue('cuenta_financiamiento_socio', '2900');
      cuentaContra = await this.contabilidad.getCuentaRequerida(codigoContra);
    } else {
      codigoContra = this.codigoContrapartida(gasto.metodo_pago);
      cuentaContra = await this.contabilidad.asegurarCuenta(codigoContra, {
        nombre: codigoContra === '2100' ? 'Cuentas por Pagar' : codigoContra === '1110' ? 'Banco — Cuenta Corriente' : 'Caja',
        tipo: codigoContra === '2100' ? 'Pasivo' : 'Activo',
      });
    }

    // IVA soportado (crédito fiscal) → 1210. Si hay IVA, el gasto se reconoce por la base.
    const iva = Number(gasto.iva_monto) || 0;
    const base = iva > 0 ? +(monto - iva).toFixed(2) : monto;

    const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
      { cuentaId: cuentaGasto.id, debe: base, haber: 0, descripcion: gasto.descripcion },
    ];
    if (iva > 0) {
      const cIva = await this.contabilidad.asegurarCuenta('1210', { nombre: 'IVA Acreditable (Crédito Fiscal)', tipo: 'Activo' });
      lineas.push({ cuentaId: cIva.id, debe: iva, haber: 0, descripcion: `IVA acreditable — ${gasto.categoria}` });
    }
    lineas.push({ cuentaId: cuentaContra.id, debe: 0, haber: monto, descripcion: `${codigoContra === '2100' ? 'Por pagar' : 'Pago'} — ${gasto.categoria}` });

    await this.contabilidad.crearAsiento((userId ? { id: userId } : undefined) as any, {
      fecha: gasto.fecha,
      descripcion: `Gasto — ${gasto.categoria}: ${gasto.descripcion}`,
      tipo: 'Gasto',
      referencia_id: gasto.id,
      referencia_tipo: 'Gasto',
      lineas,
    }, { manager });

    const repo = manager ? manager.getRepository(Gasto) : this.repo;
    await repo.update(gasto.id, { contabilizado: true });
  }

  async update(id: number, data: Partial<Gasto>): Promise<any> {
    await this.repo.update(id, data);
    const actualizado = await this.repo.findOne({ where: { id }, relations: ['proveedor', 'registrado_por'] });
    // Reversar el asiento anterior y re-postear con el monto/fecha actualizados
    await this.contabilidad
      .reversarAsientosPorReferencia('Gasto', id, undefined, 'Edición de gasto')
      .catch((e) => this.logger.warn(`Reversa gasto #${id}: ${(e as Error).message}`));
    if (actualizado) {
      await this._registrarAsiento(actualizado, actualizado.registrado_por?.id)
        .catch((e) => this.logger.error(`Re-posteo de gasto #${id} falló (queda pendiente): ${(e as Error).message}`));
    }
    return actualizado;
  }

  async remove(id: number): Promise<any> {
    // Reversa contable (no borra el asiento) antes de eliminar el gasto del subledger
    await this.contabilidad
      .reversarAsientosPorReferencia('Gasto', id, undefined, 'Eliminación de gasto')
      .catch((e) => this.logger.warn(`Reversa gasto #${id}: ${(e as Error).message}`));
    await this.repo.delete(id);
  }

  /** Sube (o reemplaza) el comprobante/factura de respaldo del gasto a GCS privado. */
  async subirComprobante(id: number, file: Express.Multer.File): Promise<Gasto> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    if (file.size > MAX_BYTES) throw new BadRequestException('El archivo supera el límite de 15 MB.');
    if (file.mimetype && !MIME_COMPROBANTE.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo no permitido: ${file.mimetype}. Use PDF o imagen.`);
    }
    const gasto = await this.repo.findOneBy({ id });
    if (!gasto) throw new NotFoundException(`Gasto #${id} no encontrado.`);

    // Borrar el anterior si existía
    if (gasto.comprobante_gcs_path) {
      await bucket.file(gasto.comprobante_gcs_path).delete().catch(() => {});
    }
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const gcsPath = `gastos-comprobantes/${id}/${uuidv4()}.${ext}`;
    await bucket.file(gcsPath).save(file.buffer, { metadata: { contentType: file.mimetype }, resumable: false });

    gasto.comprobante_gcs_path = gcsPath;
    gasto.comprobante_nombre = file.originalname;
    gasto.comprobante_mime = file.mimetype;
    await this.repo.save(gasto);
    return gasto;
  }

  async descargarComprobante(id: number): Promise<{ gasto: Gasto; buffer: Buffer }> {
    const gasto = await this.repo.findOneBy({ id });
    if (!gasto || !gasto.comprobante_gcs_path) throw new NotFoundException('El gasto no tiene comprobante.');
    const [buffer] = await bucket.file(gasto.comprobante_gcs_path).download();
    return { gasto, buffer };
  }

  async resumenPorCategoria(año: number, mes: number): Promise<any[]> {
    const desde = `${año}-${String(mes).padStart(2,'0')}-01`;
    const hasta = `${año}-${String(mes).padStart(2,'0')}-31`;
    const gastos = await this.repo.find({ where: { fecha: Between(desde, hasta) } });
    const mapa: Record<string, number> = {};
    for (const g of gastos) {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + +g.monto;
    }
    return Object.entries(mapa).map(([categoria, total]) => ({ categoria, total }));
  }
}
