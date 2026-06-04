// backend/src/leads/leads.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, Not } from 'typeorm';
import { Lead } from './lead.entity';
import { LeadActividad } from './lead-actividad.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeadsService {
  private static lastAssignedSellerIndex = -1;

  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(LeadActividad)
    private actividadesRepository: Repository<LeadActividad>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    private notificationsService: NotificationsService,
  ) {}

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

  /** Actualiza cualquier campo editable del lead */
  async updateLead(id: number, dto: UpdateLeadDto, user: User): Promise<Lead> {
    const lead = await this.findOne(id);
    const estadoAnterior = lead.estado;

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
}
