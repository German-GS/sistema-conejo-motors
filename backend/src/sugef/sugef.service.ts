import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadSugefKyc } from './lead-sugef-kyc.entity';
import { LeadSugefRetencion } from './lead-sugef-retencion.entity';
import { Lead } from '../leads/lead.entity';
import { Factura } from '../facturacion/factura.entity';

/** Total de campos requeridos (para la barra de progreso del front) */
export const SUGEF_TOTAL_REQUERIDOS = 9;

@Injectable()
export class SugefService {
  private readonly logger = new Logger(SugefService.name);

  constructor(
    @InjectRepository(LeadSugefKyc)
    private kycRepo: Repository<LeadSugefKyc>,
    @InjectRepository(LeadSugefRetencion)
    private retencionRepo: Repository<LeadSugefRetencion>,
  ) {}

  getKyc(leadId: number): Promise<LeadSugefKyc | null> {
    return this.kycRepo.findOne({ where: { lead: { id: leadId } } });
  }

  async upsertKyc(leadId: number, data: Partial<LeadSugefKyc>): Promise<LeadSugefKyc> {
    let kyc = await this.getKyc(leadId);
    // Bloqueo de identidad si hay retención activa
    if (kyc && (await this.estaBajoRetencion(leadId))) {
      return kyc; // read-only bajo retención
    }
    if (!kyc) kyc = this.kycRepo.create({ lead: { id: leadId } as Lead });
    Object.assign(kyc, data);
    // Origen de fondos derivado del tipo de ingreso (no se pide como texto libre)
    if (kyc.tipo_ingreso === 'asalariado') {
      kyc.origen_fondos = `Salario${kyc.empleador ? ' — ' + kyc.empleador : ''}`;
    } else if (kyc.tipo_ingreso === 'independiente') {
      kyc.origen_fondos = `Actividad independiente${kyc.profesion ? ': ' + kyc.profesion : ''}`;
    }
    return this.kycRepo.save(kyc);
  }

  getRetencion(leadId: number): Promise<LeadSugefRetencion | null> {
    return this.retencionRepo.findOne({
      where: { lead: { id: leadId } },
      relations: ['factura'],
    });
  }

  /** ¿El expediente del lead está bajo retención vigente? */
  async estaBajoRetencion(leadId: number): Promise<boolean> {
    const r = await this.retencionRepo.findOne({ where: { lead: { id: leadId } } });
    if (!r || !r.docs_bloqueados) return false;
    return new Date(`${r.retener_hasta}T23:59:59`) >= new Date();
  }

  /** Campos KYC que faltan (nombres crudos). Vacío = completo. Requeridos condicionales. */
  faltantesKyc(kyc: LeadSugefKyc | null): string[] {
    const vacio = (campo: string) => {
      const v = kyc ? (kyc as any)[campo] : undefined;
      return v === null || v === undefined || v === '';
    };
    // Base requerida (9 campos)
    const requeridos = [
      'nacionalidad', 'fecha_nacimiento', 'lugar_nacimiento',
      'direccion', 'pais_residencia',
      'tipo_ingreso', 'profesion', 'es_pep', 'monto_estimado_usd',
    ];
    const faltan = requeridos.filter((c) => vacio(c));
    // Si es asalariado, el empleador también es obligatorio (cuenta aparte)
    if (kyc?.tipo_ingreso === 'asalariado' && vacio('empleador')) {
      faltan.push('empleador');
    }
    return faltan;
  }

  async kycCompleto(leadId: number): Promise<boolean> {
    const kyc = await this.getKyc(leadId);
    return this.faltantesKyc(kyc).length === 0;
  }

  /** Estado SUGEF por lead: retencion | completo | incompleto (los sin registro se asumen sin_datos en el front) */
  async estadosLote(): Promise<Record<number, string>> {
    const res: Record<number, string> = {};
    const hoy = new Date();
    const rets = await this.retencionRepo.find({ relations: ['lead'] });
    for (const r of rets) {
      if (r.lead && r.docs_bloqueados && new Date(`${r.retener_hasta}T23:59:59`) >= hoy) {
        res[r.lead.id] = 'retencion';
      }
    }
    const kycs = await this.kycRepo.find({ relations: ['lead'] });
    for (const k of kycs) {
      if (!k.lead || res[k.lead.id] === 'retencion') continue;
      res[k.lead.id] = this.faltantesKyc(k).length === 0 ? 'completo' : 'incompleto';
    }
    return res;
  }

  /**
   * Registra la retención al facturar. Idempotente por lead (índice único):
   * si ya existe, conserva la fecha original y solo liga la factura si faltaba.
   */
  async registrarRetencion(leadId: number, factura?: Factura): Promise<LeadSugefRetencion> {
    const existente = await this.retencionRepo.findOne({ where: { lead: { id: leadId } } });
    if (existente) {
      if (!existente.factura && factura) {
        existente.factura = factura;
        await this.retencionRepo.save(existente);
      }
      return existente;
    }
    const hoy = new Date();
    const fechaVenta = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const hasta = new Date(hoy); hasta.setFullYear(hasta.getFullYear() + 5);
    const retenerHasta = hasta.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

    const reg = this.retencionRepo.create({
      lead: { id: leadId } as Lead,
      factura: factura ?? undefined,
      fecha_venta: fechaVenta,
      retener_hasta: retenerHasta,
      docs_bloqueados: true,
    });
    const saved = await this.retencionRepo.save(reg);
    this.logger.log(`Retención SUGEF creada para lead #${leadId} hasta ${retenerHasta}.`);
    return saved;
  }
}
