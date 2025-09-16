// src/leads/leads.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead } from './lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Injectable()
export class LeadsService {
  // Guardamos el índice del último vendedor asignado en memoria.
  // Nota: Esto se reinicia si el servidor se reinicia. Una solución más robusta
  // podría guardarlo en la base de datos o en una caché como Redis.
  private static lastAssignedSellerIndex = -1;

  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    private notificationsService: NotificationsService,
  ) {}

  async findLeadsForSeller(vendedorId: number): Promise<Lead[]> {
    return this.leadsRepository.find({
      where: {
        vendedor_asignado: { id: vendedorId },
        estado: In(['Nuevo', 'Contactado', 'En Progreso']), // Solo leads activos
      },
      order: { fecha_creacion: 'DESC' },
    });
  }

  // Método para encontrar un lead por su ID
  async findOne(id: number): Promise<Lead> {
    const lead = await this.leadsRepository.findOneBy({ id });
    if (!lead) {
      throw new NotFoundException(`Lead con ID #${id} no encontrado.`);
    }
    return lead;
  }

  // Método para actualizar el estado del lead
  async updateStatus(id: number, dto: UpdateLeadStatusDto): Promise<Lead> {
    const lead = await this.findOne(id);
    
    // Actualiza solo los campos que vienen en el DTO
    Object.assign(lead, dto);
    
    return this.leadsRepository.save(lead);
  }

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    const { nombre, email, telefono, vehiculoId } = createLeadDto;

    // 1. Encontrar todos los vendedores activos
    const vendedores = await this.usersRepository.find({
      where: { rol: { nombre: 'Vendedor' }, activo: true },
      order: { id: 'ASC' }, // Ordenamos para asegurar consistencia
    });

    if (vendedores.length === 0) {
      throw new NotFoundException(
        'No hay vendedores disponibles para asignar el lead.',
      );
    }

    // 2. Lógica de asignación Round-Robin
    LeadsService.lastAssignedSellerIndex =
      (LeadsService.lastAssignedSellerIndex + 1) % vendedores.length;
    const vendedorAsignado = vendedores[LeadsService.lastAssignedSellerIndex];

    // 3. (Opcional) Buscar el vehículo de interés si se proporcionó un ID
    let vehiculo: Vehicle | null = null;
    if (vehiculoId) {
      vehiculo = await this.vehiclesRepository.findOneBy({ id: vehiculoId });
    }

    // 4. Crear la nueva instancia del Lead
    const nuevoLead = this.leadsRepository.create({
      nombre_cliente: nombre,
      email_cliente: email,
      telefono_cliente: telefono,
      vendedor_asignado: vendedorAsignado,
      vehiculo_interes: vehiculo || undefined,
    });

    const leadGuardado = await this.leadsRepository.save(nuevoLead);

     const message = `Nuevo lead asignado: ${nombre} (${email}).`;
    const link = `/sales/leads/${leadGuardado.id}`; // Ruta para que el vendedor vea sus leads
    await this.notificationsService.createForUser(vendedorAsignado, message, link);

    return leadGuardado;
  }

  // Aquí podrías añadir métodos para que los vendedores vean sus leads, etc.
  // async findLeadsForSeller(vendedorId: number): Promise<Lead[]> { ... }
}
