// backend/src/leads/leads.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, Not, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Lead } from './lead.entity';
import { LeadActividad } from './lead-actividad.entity';
import { LeadFinanciamiento, EntidadFinanciera, EstadoFinanciamiento } from './lead-financiamiento.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Campana } from '../campanas/campana.entity';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { SiteSetting } from '../site-settings/site-setting.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SugefService } from '../sugef/sugef.service';

@Injectable()
export class LeadsService {
  private static lastAssignedSellerIndex = -1;
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(LeadActividad)
    private actividadesRepository: Repository<LeadActividad>,
    @InjectRepository(LeadFinanciamiento)
    private financiamientosRepository: Repository<LeadFinanciamiento>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Campana)
    private campanasRepository: Repository<Campana>,
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(SiteSetting)
    private siteSettingsRepository: Repository<SiteSetting>,
    private notificationsService: NotificationsService,
    private sugefService: SugefService,
  ) {}

  /** Días de inactividad tras el seguimiento para auto-descartar leads tibios */
  private async getDiasDescarte(): Promise<number> {
    const s = await this.siteSettingsRepository.findOneBy({ key: 'lead_descarte_dias' });
    const n = Number(s?.value);
    return !isNaN(n) && n > 0 ? n : 4;
  }

  /** Indica si un lead tuvo actividad después de cierta fecha */
  private async tuvoActividadDespuesDe(leadId: number, fecha: Date): Promise<boolean> {
    const count = await this.actividadesRepository.count({
      where: { lead: { id: leadId }, fecha_creacion: MoreThan(fecha) },
    });
    return count > 0;
  }

  // ── CRON: auto-archivado de leads tibios sin seguimiento (3:00am CR = 09:00 UTC) ──
  @Cron('0 9 * * *', { timeZone: 'UTC' })
  async cronAutoDescarte(): Promise<void> {
    try {
      const dias = await this.getDiasDescarte();
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

      const candidatos = await this.leadsRepository.find({
        where: {
          temperatura: 'Tibio' as any,
          estado: Not(In(['Cerrado', 'Perdido', 'Descartado'])),
        },
        relations: ['vendedor_asignado'],
      });

      for (const lead of candidatos) {
        if (!lead.fecha_followup) continue;
        const fseg = new Date(`${lead.fecha_followup}T00:00:00`);
        const limite = new Date(fseg); limite.setDate(limite.getDate() + dias);
        const avisoDia = new Date(limite); avisoDia.setDate(avisoDia.getDate() - 1);

        // ¿Hubo actividad después del seguimiento? Si sí, no se descarta.
        if (await this.tuvoActividadDespuesDe(lead.id, fseg)) continue;

        if (hoy >= limite) {
          lead.estado = 'Descartado';
          await this.leadsRepository.save(lead);
          await this.actividadesRepository.save(this.actividadesRepository.create({
            lead, tipo: 'estado_cambio',
            descripcion: `Lead descartado automáticamente: tibio y sin actividad ${dias} días después del seguimiento (${lead.fecha_followup}).`,
          }));
          if (lead.vendedor_asignado) {
            await this.notificationsService.createForUser(
              lead.vendedor_asignado,
              `🗃️ El lead ${lead.nombre_cliente} se descartó automáticamente por inactividad.`,
              '/sales/leads',
            );
          }
        } else if (hoy.getTime() === avisoDia.getTime() && lead.vendedor_asignado) {
          // Aviso 1 día antes
          await this.notificationsService.createForUser(
            lead.vendedor_asignado,
            `⏳ El lead ${lead.nombre_cliente} (tibio) se descartará mañana si no registrás actividad.`,
            '/sales/leads',
          );
        }
      }
    } catch (e) {
      this.logger.error('Error en auto-descarte de leads', (e as Error).message);
    }
  }

  /** Informe integral de CRM/Leads para mejora de procesos */
  async analytics(startDate?: string, endDate?: string): Promise<any> {
    let leads = await this.leadsRepository.find({ relations: ['vendedor_asignado', 'campana'] });
    if (startDate && endDate) {
      const ini = new Date(`${startDate}T00:00:00-06:00`).getTime();
      const fin = new Date(`${endDate}T23:59:59-06:00`).getTime();
      leads = leads.filter((l) => {
        const t = new Date(l.fecha_creacion).getTime();
        return t >= ini && t <= fin;
      });
    }

    const total = leads.length;
    const cuenta = (pred: (l: Lead) => boolean) => leads.filter(pred).length;

    // Embudo por estado
    const ESTADOS = ['Nuevo', 'Contactado', 'En Progreso', 'Cerrado', 'Perdido', 'Descartado'];
    const funnel = ESTADOS.map((e) => ({ estado: e, total: cuenta((l) => l.estado === e) }));
    const cerradosTotal = cuenta((l) => l.estado === 'Cerrado');

    // Por temperatura (con tasa de cierre)
    const TEMPS = ['Caliente', 'Tibio', 'Frio'];
    const porTemperatura = TEMPS.map((t) => {
      const ls = leads.filter((l) => l.temperatura === t);
      const cerr = ls.filter((l) => l.estado === 'Cerrado').length;
      return { temperatura: t, total: ls.length, cerrados: cerr, tasaCierre: ls.length ? Math.round((cerr / ls.length) * 100) : 0 };
    });
    const sinTemperatura = cuenta((l) => !l.temperatura);

    // Por última etapa alcanzada (dónde se quedan los leads)
    const etapasMap = new Map<string, number>();
    for (const l of leads) {
      const k = l.ultima_etapa || 'Sin etapa registrada';
      etapasMap.set(k, (etapasMap.get(k) ?? 0) + 1);
    }
    const porEtapa = Array.from(etapasMap.entries())
      .map(([etapa, t]) => ({ etapa, total: t }))
      .sort((a, b) => b.total - a.total);

    // Seguimientos (solo leads activos)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const activos = leads.filter((l) => !['Cerrado', 'Perdido', 'Descartado'].includes(l.estado));
    const segVencidos = activos.filter((l) => l.fecha_followup && new Date(`${l.fecha_followup}T00:00:00`) < hoy).length;
    const segAlDia = activos.filter((l) => l.fecha_followup && new Date(`${l.fecha_followup}T00:00:00`) >= hoy).length;
    const segSinFecha = activos.filter((l) => !l.fecha_followup).length;

    // Por vendedor (activos, cerrados, vencidos)
    const vendMap = new Map<string, any>();
    for (const l of leads) {
      const v = l.vendedor_asignado?.nombre_completo || 'Sin asignar';
      if (!vendMap.has(v)) vendMap.set(v, { vendedor: v, total: 0, cerrados: 0, activos: 0, vencidos: 0 });
      const e = vendMap.get(v);
      e.total++;
      if (l.estado === 'Cerrado') e.cerrados++;
      if (!['Cerrado', 'Perdido', 'Descartado'].includes(l.estado)) {
        e.activos++;
        if (l.fecha_followup && new Date(`${l.fecha_followup}T00:00:00`) < hoy) e.vencidos++;
      }
    }
    const porVendedor = Array.from(vendMap.values())
      .map((r) => ({ ...r, tasaCierre: r.total ? Math.round((r.cerrados / r.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    return {
      total,
      tasaCierreGlobal: total ? Math.round((cerradosTotal / total) * 100) : 0,
      cerrados: cerradosTotal,
      descartados: cuenta((l) => l.estado === 'Descartado'),
      perdidos: cuenta((l) => l.estado === 'Perdido'),
      funnel,
      porFuente: await this.reportePorFuente(startDate, endDate),
      porTemperatura,
      sinTemperatura,
      porEtapa,
      seguimientos: { vencidos: segVencidos, alDia: segAlDia, sinFecha: segSinFecha, totalActivos: activos.length },
      porVendedor,
    };
  }

  /** Reporte de conversión por fuente: cuántos leads por fuente en cada estado */
  async reportePorFuente(startDate?: string, endDate?: string): Promise<any[]> {
    let leads = await this.leadsRepository.find({ relations: ['campana'] });
    if (startDate && endDate) {
      const ini = new Date(`${startDate}T00:00:00-06:00`).getTime();
      const fin = new Date(`${endDate}T23:59:59-06:00`).getTime();
      leads = leads.filter((l) => {
        const t = new Date(l.fecha_creacion).getTime();
        return t >= ini && t <= fin;
      });
    }
    const map = new Map<string, any>();
    for (const l of leads) {
      const key = l.fuente || 'Otro';
      if (!map.has(key)) {
        map.set(key, { fuente: key, total: 0, En_Progreso: 0, Cerrado: 0, Descartado: 0, Perdido: 0, Nuevo: 0 });
      }
      const e = map.get(key);
      e.total++;
      const estadoKey = ['Cerrado', 'Descartado', 'Perdido', 'Nuevo'].includes(l.estado) ? l.estado : 'En_Progreso';
      e[estadoKey] = (e[estadoKey] ?? 0) + 1;
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, tasaCierre: r.total > 0 ? Math.round((r.Cerrado / r.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }

  /** Migración: vincula el vehículo de las cotizaciones a los leads que no lo tienen */
  async fixVehiculosFromCotizaciones(): Promise<{ actualizados: number }> {
    const leads = await this.leadsRepository.find({
      where: { vehiculo_interes: null as any },
      relations: [],
    });
    let actualizados = 0;
    for (const lead of leads) {
      const cotizacion = await this.cotizacionesRepository.findOne({
        where: { lead: { id: lead.id } } as any,
        relations: ['vehiculo'],
        order: { fecha_creacion: 'DESC' },
      });
      if (cotizacion?.vehiculo) {
        await this.leadsRepository.update(lead.id, { vehiculo_interes: cotizacion.vehiculo });
        actualizados++;
      }
    }
    return { actualizados };
  }

  /** Admin: todos los leads */
  async findAll(): Promise<Lead[]> {
    return this.leadsRepository.find({
      relations: ['vendedor_asignado', 'vehiculo_interes'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  /** Vendedor: solo sus leads activos */
  async findLeadsForSeller(vendedorId: number): Promise<Lead[]> {
    return this.leadsRepository.find({
      where: {
        vendedor_asignado: { id: vendedorId },
        estado: In(['Nuevo', 'Contactado', 'En Progreso']),
      },
      relations: ['vehiculo_interes'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({
      where: { id },
      relations: ['vendedor_asignado', 'vehiculo_interes', 'actividades', 'actividades.usuario'],
    });
    if (!lead) throw new NotFoundException(`Lead #${id} no encontrado.`);
    return lead;
  }

  /** Elimina un lead permanentemente (con sus actividades por cascade) */
  async eliminarLead(id: number): Promise<{ mensaje: string }> {
    const lead = await this.findOne(id);
    // No se puede eliminar un lead con expediente SUGEF bajo retención
    const ret = await this.sugefService.getRetencion(id);
    if (ret) {
      throw new BadRequestException(
        `No se puede eliminar: este lead tiene una venta facturada con expediente SUGEF que debe conservarse hasta el ${new Date(`${ret.retener_hasta}T00:00:00`).toLocaleDateString('es-CR')}.`,
      );
    }
    await this.leadsRepository.delete(lead.id);
    return { mensaje: `Lead #${id} eliminado correctamente.` };
  }

  /** Actualiza cualquier campo editable del lead */
  async updateLead(id: number, dto: UpdateLeadDto, user: User): Promise<Lead> {
    const lead = await this.findOne(id);
    const estadoAnterior = lead.estado;

    // Cambio de nombre del cliente — queda en el log del timeline
    if (dto.nombre_cliente !== undefined) {
      const nuevoNombre = dto.nombre_cliente.trim();
      if (nuevoNombre && nuevoNombre !== lead.nombre_cliente) {
        await this.actividadesRepository.save(
          this.actividadesRepository.create({
            lead,
            tipo: 'estado_cambio',
            descripcion: `Nombre del cliente corregido de "${lead.nombre_cliente}" a "${nuevoNombre}"`,
            usuario: user,
          }),
        );
        lead.nombre_cliente = nuevoNombre;
      }
    }

    // Reasignación de vendedor
    if (dto.vendedor_asignado_id !== undefined) {
      const nuevoVendedor = await this.usersRepository.findOneBy({ id: dto.vendedor_asignado_id });
      if (nuevoVendedor) {
        lead.vendedor_asignado = nuevoVendedor;
        await this.actividadesRepository.save(
          this.actividadesRepository.create({
            lead,
            tipo: 'estado_cambio',
            descripcion: `Lead reasignado a ${nuevoVendedor.nombre_completo}`,
            usuario: user,
          }),
        );
      }
    }

    // Cambio de estado
    if (dto.estado && dto.estado !== estadoAnterior) {
      await this.actividadesRepository.save(
        this.actividadesRepository.create({
          lead,
          tipo: 'estado_cambio',
          descripcion: `Estado cambiado de "${estadoAnterior}" a "${dto.estado}"`,
          usuario: user,
        }),
      );

      // Si el lead se marca como Perdido → liberar el vehículo de interés
      if (dto.estado === 'Perdido' && lead.vehiculo_interes?.id) {
        const vehiculo = await this.vehiclesRepository.findOneBy({ id: lead.vehiculo_interes.id });
        if (vehiculo && vehiculo.estado === 'Reservado') {
          await this.vehiclesRepository.update(vehiculo.id, { estado: 'Disponible' });
          await this.actividadesRepository.save(
            this.actividadesRepository.create({
              lead,
              tipo: 'nota',
              descripcion: `Vehículo ${vehiculo.marca} ${vehiculo.modelo} liberado automáticamente (lead perdido).`,
              usuario: user,
            }),
          );
        }
      }
    }

    // Actualizar campos simples
    if (dto.estado) lead.estado = dto.estado as any;
    if (dto.fuente) lead.fuente = dto.fuente as any;
    if (dto.notas !== undefined) lead.notas = dto.notas;
    if (dto.fecha_followup !== undefined) lead.fecha_followup = dto.fecha_followup;
    if (dto.contacted_by_email !== undefined) lead.contacted_by_email = dto.contacted_by_email;
    if (dto.contacted_by_phone !== undefined) lead.contacted_by_phone = dto.contacted_by_phone;
    if (dto.tipo_pago !== undefined) lead.tipo_pago = dto.tipo_pago as any;
    if (dto.cedula_cliente !== undefined) lead.cedula_cliente = dto.cedula_cliente;
    if (dto.temperatura !== undefined) lead.temperatura = (dto.temperatura || undefined) as any;
    if (dto.ultima_etapa !== undefined) lead.ultima_etapa = dto.ultima_etapa || undefined;
    if (dto.prima_disponible !== undefined) lead.prima_disponible = dto.prima_disponible as any;
    if (dto.contacted_by_whatsapp !== undefined) lead.contacted_by_whatsapp = dto.contacted_by_whatsapp;
    if (dto.campana_id !== undefined) {
      lead.campana = dto.campana_id
        ? await this.campanasRepository.findOneBy({ id: dto.campana_id }) ?? undefined
        : undefined;
    }

    return this.leadsRepository.save(lead);
  }

  /** Mantiene compatibilidad con el endpoint anterior */
  async updateStatus(id: number, dto: any): Promise<Lead> {
    const lead = await this.findOne(id);
    Object.assign(lead, dto);
    return this.leadsRepository.save(lead);
  }

  /** Agrega una actividad al historial del lead */
  async addActividad(leadId: number, dto: CreateActividadDto, user: User): Promise<LeadActividad> {
    const lead = await this.findOne(leadId);
    const actividad = this.actividadesRepository.create({
      lead,
      tipo: dto.tipo as any,
      descripcion: dto.descripcion,
      entidad: dto.entidad,
      estado_fin: dto.estado_fin,
      usuario: user,
    });
    return this.actividadesRepository.save(actividad);
  }

  /** Conteo de follow-ups vencidos para badge en el menú */
  async getOverdueFollowupCount(user: User): Promise<{ count: number }> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const where: any = {
      fecha_followup: LessThan(hoy),
      estado: Not(In(['Cerrado', 'Perdido'])),
    };
    if (user.rol?.nombre !== 'Administrador') {
      where.vendedor_asignado = { id: user.id };
    }
    const count = await this.leadsRepository.count({ where });
    return { count };
  }

  /** Creación manual desde el panel (vendedor lo toma para sí; admin lo asigna por turno) */
  async createManual(
    body: { nombre: string; email?: string; telefono?: string; cedula?: string; fuente?: string; vehiculoId?: number; vendedor_asignado_id?: number; campana_id?: number },
    user: User,
  ): Promise<Lead> {
    const nombre = (body.nombre ?? '').trim();
    if (!nombre) throw new BadRequestException('El nombre del cliente es requerido.');
    if (!body.email && !body.telefono) {
      throw new BadRequestException('Indique al menos un contacto: email o teléfono.');
    }

    // Asignación de vendedor
    let vendedorAsignado: User | null = null;
    if (body.vendedor_asignado_id) {
      vendedorAsignado = await this.usersRepository.findOneBy({ id: body.vendedor_asignado_id });
    } else if (user.rol?.nombre === 'Vendedor') {
      vendedorAsignado = user; // el vendedor toma su propio lead
    } else {
      // Admin sin asignar explícito → round-robin entre vendedores activos
      const vendedores = await this.usersRepository.find({
        where: { rol: { nombre: 'Vendedor' }, activo: true },
        order: { id: 'ASC' },
      });
      if (vendedores.length) {
        LeadsService.lastAssignedSellerIndex = (LeadsService.lastAssignedSellerIndex + 1) % vendedores.length;
        vendedorAsignado = vendedores[LeadsService.lastAssignedSellerIndex];
      }
    }

    let vehiculo: Vehicle | null = null;
    if (body.vehiculoId) {
      vehiculo = await this.vehiclesRepository.findOneBy({ id: body.vehiculoId });
    }

    let campana: Campana | null = null;
    if (body.campana_id) {
      campana = await this.campanasRepository.findOneBy({ id: body.campana_id });
    }

    const nuevoLead = this.leadsRepository.create({
      nombre_cliente: nombre,
      email_cliente: body.email?.trim() || '',
      telefono_cliente: body.telefono?.trim() || undefined,
      cedula_cliente: body.cedula?.trim() || undefined,
      fuente: (body.fuente as any) || 'Presencial',
      estado: 'Nuevo',
      vendedor_asignado: vendedorAsignado || undefined,
      vehiculo_interes: vehiculo || undefined,
      campana: campana || undefined,
    });
    const guardado = await this.leadsRepository.save(nuevoLead);

    // Registrar en el historial
    await this.actividadesRepository.save(
      this.actividadesRepository.create({
        lead: guardado,
        tipo: 'nota',
        descripcion: `Lead creado manualmente por ${user.nombre_completo ?? user.email}.`,
        usuario: user,
      }),
    );

    if (vendedorAsignado && vendedorAsignado.id !== user.id) {
      await this.notificationsService.createForUser(
        vendedorAsignado,
        `Nuevo lead asignado: ${nombre}.`,
        `/sales/leads/${guardado.id}`,
      );
    }

    return guardado;
  }

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    const { nombre, email, telefono, vehiculoId } = createLeadDto;

    const vendedores = await this.usersRepository.find({
      where: { rol: { nombre: 'Vendedor' }, activo: true },
      order: { id: 'ASC' },
    });

    if (vendedores.length === 0) {
      throw new NotFoundException('No hay vendedores disponibles para asignar el lead.');
    }

    LeadsService.lastAssignedSellerIndex =
      (LeadsService.lastAssignedSellerIndex + 1) % vendedores.length;
    const vendedorAsignado = vendedores[LeadsService.lastAssignedSellerIndex];

    let vehiculo: Vehicle | null = null;
    if (vehiculoId) {
      vehiculo = await this.vehiclesRepository.findOneBy({ id: vehiculoId });
    }

    const nuevoLead = this.leadsRepository.create({
      nombre_cliente: nombre,
      email_cliente: email,
      telefono_cliente: telefono,
      vendedor_asignado: vendedorAsignado,
      vehiculo_interes: vehiculo || undefined,
    });

    const leadGuardado = await this.leadsRepository.save(nuevoLead);

    const message = `Nuevo lead asignado: ${nombre} (${email}).`;
    const link = `/sales/leads`;
    await this.notificationsService.createForUser(vendedorAsignado, message, link);

    return leadGuardado;
  }

  // ── FINANCIAMIENTO ────────────────────────────────────────────────────────

  /** Obtiene todos los registros de financiamiento de un lead */
  async getFinanciamientos(leadId: number): Promise<LeadFinanciamiento[]> {
    const lead = await this.leadsRepository.findOneBy({ id: leadId });
    if (!lead) throw new NotFoundException(`Lead #${leadId} no encontrado.`);
    return this.financiamientosRepository.find({
      where: { lead: { id: leadId } },
      order: { fecha_creacion: 'ASC' },
    });
  }

  /** Crea o actualiza un registro de financiamiento para una entidad */
  async upsertFinanciamiento(
    leadId: number,
    data: {
      entidad: EntidadFinanciera;
      estado?: EstadoFinanciamiento;
      monto_solicitado?: number;
      monto_aprobado?: number;
      plazo_meses?: number;
      tasa_anual?: number;
      notas?: string;
      fecha_envio?: string;
      fecha_respuesta?: string;
      fecha_proximo_seguimiento?: string;
    },
  ): Promise<LeadFinanciamiento> {
    const lead = await this.leadsRepository.findOneBy({ id: leadId });
    if (!lead) throw new NotFoundException(`Lead #${leadId} no encontrado.`);

    // Busca si ya existe un registro para esa entidad en este lead
    let registro = await this.financiamientosRepository.findOne({
      where: { lead: { id: leadId }, entidad: data.entidad },
    });

    if (registro) {
      Object.assign(registro, data);
    } else {
      registro = this.financiamientosRepository.create({ lead, ...data });
    }

    return this.financiamientosRepository.save(registro);
  }

  /** Elimina un registro de financiamiento */
  async deleteFinanciamiento(leadId: number, financiamientoId: number): Promise<void> {
    await this.financiamientosRepository.delete({
      id: financiamientoId,
      lead: { id: leadId },
    });
  }
}
