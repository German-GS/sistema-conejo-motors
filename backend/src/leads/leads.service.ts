// backend/src/leads/leads.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, Not } from 'typeorm';
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
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeadsService {
  private static lastAssignedSellerIndex = -1;

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
    private notificationsService: NotificationsService,
  ) {}

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
