// src/leads/leads.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { NotificationsService } from '../notifications/notifications.service';

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

    // 5. Enviar notificación al vendedor asignado
    const message = `Nuevo lead de ${nombre} (${email}).`;
    // Idealmente, el link llevaría a una página de detalles del lead en el panel
    const link = `/admin/leads/${leadGuardado.id}`;
    await this.notificationsService.createForAdmins(message, link); // Asumimos que los vendedores ven notificaciones de "admin" o creamos un método específico.

    return leadGuardado;
  }

  // Aquí podrías añadir métodos para que los vendedores vean sus leads, etc.
  // async findLeadsForSeller(vendedorId: number): Promise<Lead[]> { ... }
}
