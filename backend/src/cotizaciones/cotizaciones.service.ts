import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { ClientesService } from '../clientes/clientes.service';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Lead } from '../leads/lead.entity';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    private clientesService: ClientesService,
  ) {}

  async findMyQuotes(vendedor: User): Promise<Cotizacion[]> {
    return this.cotizacionesRepository.find({
      where: { vendedor: { id: vendedor.id } },
      relations: ['cliente', 'vehiculo', 'lead'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findAll(): Promise<Cotizacion[]> {
    return this.cotizacionesRepository.find({
      relations: ['cliente', 'vehiculo', 'vendedor', 'lead'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionesRepository.findOne({
      where: { id },
      relations: ['cliente', 'vehiculo', 'vendedor', 'lead'],
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID #${id} no encontrada.`);
    }
    return cotizacion;
  }

  async create(createDto: CreateCotizacionDto, vendedor: User): Promise<Cotizacion> {
    const cliente = await this.clientesService.findOrCreate(createDto.cliente);

    const vehiculo = await this.vehiclesRepository.findOneBy({ id: createDto.vehiculoId });
    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con ID #${createDto.vehiculoId} no encontrado.`);
    }

    let lead: Lead | null = null;

    if (createDto.leadId) {
      // Lead ya existente — vincularlo
      lead = await this.leadsRepository.findOneBy({ id: createDto.leadId });
      // Actualizar estado a "En Progreso" si sigue en Nuevo/Contactado
      if (lead && ['Nuevo', 'Contactado'].includes(lead.estado)) {
        await this.leadsRepository.update(lead.id, { estado: 'En Progreso' });
      }
    } else {
      // Sin lead previo → crear uno automáticamente desde los datos de la cotización
      const fuente = (createDto.fuente_lead as any) || 'Otro';
      const nuevoLead = this.leadsRepository.create({
        nombre_cliente:  createDto.cliente.nombre_completo,
        email_cliente:   createDto.cliente.email || '',
        telefono_cliente: createDto.cliente.telefono,
        fuente,
        estado:          'En Progreso',
        vendedor_asignado: vendedor,
        vehiculo_interes: vehiculo,
        notas: `Lead generado automáticamente al crear cotización el ${new Date().toLocaleDateString('es-CR')}.`,
      });
      lead = await this.leadsRepository.save(nuevoLead);
    }

    // Marcar vehículo como Reservado al generar cotización
    if (vehiculo.estado === 'Disponible') {
      await this.vehiclesRepository.update(vehiculo.id, { estado: 'Reservado' });
    }

    const nuevaCotizacion = this.cotizacionesRepository.create({
      cliente,
      vehiculo,
      vendedor,
      lead: lead ?? undefined,
      vehiculo_descripcion: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.año})`,
      precio_lista:    createDto.precio_lista    ?? createDto.precio_final,
      descuento_monto: createDto.descuento_monto  ?? 0,
      precio_final:    createDto.precio_final,
      iva_porcentaje:  createDto.iva_porcentaje   ?? 13,
      iva_monto:       +(createDto.precio_final * ((createDto.iva_porcentaje ?? 13) / 100)).toFixed(2),
      total_con_iva:   +(createDto.precio_final * (1 + (createDto.iva_porcentaje ?? 13) / 100)).toFixed(2),
      fecha_expiracion: createDto.fecha_expiracion,
      gasto_marchamo:          createDto.gasto_marchamo   ?? 0,
      gasto_inscripcion:       createDto.gasto_inscripcion ?? 0,
      gasto_placas:            createDto.gasto_placas      ?? 0,
      gasto_otros:             createDto.gasto_otros       ?? 0,
      gasto_otros_descripcion: createDto.gasto_otros_descripcion ?? '',
      regalias:       createDto.regalias      ?? '',
      notas_cliente:  createDto.notas_cliente ?? '',
    });

    return this.cotizacionesRepository.save(nuevaCotizacion);
  }
}
