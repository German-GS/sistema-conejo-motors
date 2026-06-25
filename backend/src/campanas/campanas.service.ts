import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Campana } from './campana.entity';
import { CreateCampanaDto } from './dto/create-campana.dto';
import { GastosService } from '../gastos/gastos.service';
import { Lead } from '../leads/lead.entity';
import { User } from '../users/user.entity';

@Injectable()
export class CampanasService {
  private readonly logger = new Logger(CampanasService.name);

  constructor(
    @InjectRepository(Campana)
    private repo: Repository<Campana>,
    @InjectRepository(Lead)
    private leadsRepo: Repository<Lead>,
    private gastosService: GastosService,
  ) {}

  /** Finaliza automáticamente las campañas cuya fecha de fin ya pasó */
  async finalizarVencidas(): Promise<number> {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const vencidas = await this.repo.find({
      where: { estado: Not('Finalizada'), fecha_fin: LessThan(hoy) as any },
    });
    for (const c of vencidas) {
      c.estado = 'Finalizada';
      await this.repo.save(c);
    }
    if (vencidas.length) this.logger.log(`Auto-finalización: ${vencidas.length} campaña(s) finalizada(s).`);
    return vencidas.length;
  }

  // Cron diario 12:30am CR (06:30 UTC): finaliza campañas vencidas
  @Cron('30 6 * * *', { timeZone: 'UTC' })
  async cronFinalizarVencidas() {
    await this.finalizarVencidas();
  }

  async findAll(): Promise<Campana[]> {
    // Auto-finaliza al consultar, para que el estado esté siempre al día
    await this.finalizarVencidas();
    return this.repo.find({ order: { fecha_creacion: 'DESC' } });
  }

  /** Solo las campañas activas — para el dropdown del CRM */
  findActivas(): Promise<Campana[]> {
    return this.repo.find({ where: { estado: 'Activa' }, order: { fecha_inicio: 'DESC' } });
  }

  async findOne(id: number): Promise<Campana> {
    const c = await this.repo.findOneBy({ id });
    if (!c) throw new NotFoundException(`Campaña #${id} no encontrada.`);
    return c;
  }

  async create(dto: CreateCampanaDto, user: User): Promise<Campana> {
    const campana: Campana = this.repo.create({
      nombre: dto.nombre,
      plataforma: dto.plataforma as any,
      estado: 'Activa',
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: dto.fecha_fin,
      presupuesto_crc: dto.presupuesto_crc ?? 0,
      objetivo: dto.objetivo,
      creado_por: user,
    });
    const saved: Campana = await this.repo.save(campana);

    // Si tiene presupuesto → registrar automáticamente en gastos operativos
    if (Number(dto.presupuesto_crc) > 0) {
      try {
        const hoyEnCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
        const gasto: any = await this.gastosService.create({
          categoria: 'Publicidad',
          descripcion: `Campaña ${dto.plataforma}: ${dto.nombre}`,
          monto: Number(dto.presupuesto_crc),
          fecha: hoyEnCR,
          notas: `Registrado automáticamente desde gestión de campañas (ID #${saved.id})`,
        } as any, user.id);
        // Guardar referencia al gasto en la campaña
        await this.repo.update(saved.id, { gasto_id: gasto.id });
        saved.gasto_id = gasto.id;
      } catch {
        // Si falla el asiento no se bloquea la campaña
      }
    }

    return saved;
  }

  async update(id: number, data: Partial<Campana>): Promise<Campana> {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.repo.findOneBy({ id }) as Promise<Campana>;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }

  /** Métricas de una campaña: leads, cotizaciones y ventas cerradas */
  async getMetricas(id: number) {
    const campana = await this.findOne(id);
    const leads = await this.leadsRepo.find({
      where: { campana: { id } } as any,
      relations: [],
    });

    const totalLeads   = leads.length;
    const cotizaciones = leads.filter(l => ['Cotizacion Enviada', 'Negociacion', 'Cerrado'].includes(l.estado)).length;
    const cerrados     = leads.filter(l => l.estado === 'Cerrado').length;
    const perdidos     = leads.filter(l => l.estado === 'Perdido').length;
    const presupuesto  = Number(campana.presupuesto_crc) || 0;

    return {
      campana,
      totalLeads,
      cotizaciones,
      cerrados,
      perdidos,
      tasaConversion: totalLeads > 0 ? Math.round((cerrados / totalLeads) * 100) : 0,
      costoPorLead:   totalLeads > 0 && presupuesto > 0 ? Math.round(presupuesto / totalLeads) : 0,
      costoPorCierre: cerrados > 0 && presupuesto > 0 ? Math.round(presupuesto / cerrados) : 0,
    };
  }
}
