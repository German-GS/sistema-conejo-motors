import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cotizacion } from './cotizacion.entity';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { ClientesService } from '../clientes/clientes.service';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Lead } from '../leads/lead.entity';

/** Días de reserva automática al crear una cotización */
const DIAS_RESERVA = 4;

@Injectable()
export class CotizacionesService {
  private readonly logger = new Logger(CotizacionesService.name);

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

  /** Alertas de cotizaciones que vencen pronto (próximas 24 h) — para dashboard */
  async getAlertasVencimiento(): Promise<{
    vencenHoy: number;
    vencenManana: number;
    lista: { id: number; cliente: string; vehiculo: string; fecha_expiracion: Date; horasRestantes: number }[];
  }> {
    const ahora = new Date();
    const en48h = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

    const proximas = await this.cotizacionesRepository.find({
      where: {
        estado: In(['Borrador', 'Enviada']),
        fecha_expiracion: LessThanOrEqual(en48h),
      },
      relations: ['cliente', 'vehiculo'],
      order: { fecha_expiracion: 'ASC' },
    });

    const lista = proximas.map(c => {
      const msRestantes = new Date(c.fecha_expiracion).getTime() - ahora.getTime();
      const horasRestantes = Math.max(0, Math.floor(msRestantes / (1000 * 60 * 60)));
      return {
        id: c.id,
        cliente: c.cliente?.nombre_completo ?? '—',
        vehiculo: c.vehiculo_descripcion ?? '—',
        fecha_expiracion: c.fecha_expiracion,
        horasRestantes,
      };
    });

    const medianoche = new Date(ahora); medianoche.setHours(23, 59, 59, 999);
    return {
      vencenHoy:    lista.filter(c => new Date(c.fecha_expiracion) <= medianoche).length,
      vencenManana: lista.filter(c => new Date(c.fecha_expiracion) > medianoche).length,
      lista,
    };
  }

  /** Cancela una cotización (admin o vendedor) y libera el vehículo si estaba Reservado */
  async cancelarCotizacion(id: number, motivo: string): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    if (!['Borrador', 'Enviada'].includes(cotizacion.estado)) {
      throw new NotFoundException(`Solo se pueden cancelar cotizaciones activas (Borrador o Enviada).`);
    }

    // Cancelar cotización
    await this.cotizacionesRepository.update(id, {
      estado: 'Cancelada',
      motivo_cancelacion: motivo ?? '',
    });

    // Liberar vehículo si sigue Reservado
    if (cotizacion.vehiculo?.id) {
      const vehiculo = await this.vehiclesRepository.findOneBy({ id: cotizacion.vehiculo.id });
      if (vehiculo?.estado === 'Reservado') {
        await this.vehiclesRepository.update(vehiculo.id, { estado: 'Disponible' });
      }
    }

    return this.findOne(id);
  }

  /** Admin: extiende la fecha de expiración de una cotización */
  async extenderReserva(id: number, diasExtra: number): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    if (!['Borrador', 'Enviada'].includes(cotizacion.estado)) {
      throw new NotFoundException(`Solo se pueden extender cotizaciones activas.`);
    }
    const fechaActual = new Date(cotizacion.fecha_expiracion);
    const nuevaFecha = new Date(fechaActual.getTime() + diasExtra * 24 * 60 * 60 * 1000);
    await this.cotizacionesRepository.update(id, { fecha_expiracion: nuevaFecha });
    return this.findOne(id);
  }

  async create(createDto: CreateCotizacionDto, vendedor: User): Promise<Cotizacion> {
    const cliente = await this.clientesService.findOrCreate(createDto.cliente);

    const vehiculo = await this.vehiclesRepository.findOneBy({ id: createDto.vehiculoId });
    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con ID #${createDto.vehiculoId} no encontrado.`);
    }

    let lead: Lead | null = null;

    if (createDto.leadId) {
      lead = await this.leadsRepository.findOneBy({ id: createDto.leadId });
      if (lead && ['Nuevo', 'Contactado'].includes(lead.estado)) {
        await this.leadsRepository.update(lead.id, { estado: 'En Progreso' });
      }
    } else {
      const fuente = (createDto.fuente_lead as any) || 'Otro';
      const nuevoLead = this.leadsRepository.create({
        nombre_cliente:   createDto.cliente.nombre_completo,
        email_cliente:    createDto.cliente.email || '',
        telefono_cliente: createDto.cliente.telefono,
        fuente,
        estado:           'En Progreso',
        vendedor_asignado: vendedor,
        vehiculo_interes:  vehiculo,
        notas: `Lead generado automáticamente al crear cotización el ${new Date().toLocaleDateString('es-CR')}.`,
      });
      lead = await this.leadsRepository.save(nuevoLead);
    }

    // Marcar vehículo como Reservado
    if (vehiculo.estado === 'Disponible') {
      await this.vehiclesRepository.update(vehiculo.id, { estado: 'Reservado' });
    }

    // Fecha de expiración automática: hoy + 4 días (a medianoche CR)
    let fechaExpiracion: Date;
    if (createDto.fecha_expiracion) {
      fechaExpiracion = new Date(createDto.fecha_expiracion);
    } else {
      fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + DIAS_RESERVA);
      fechaExpiracion.setHours(23, 59, 59, 0);
    }

    const nuevaCotizacion = this.cotizacionesRepository.create({
      cliente,
      vehiculo,
      vendedor,
      lead:             lead ?? undefined,
      vehiculo_descripcion: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.año})`,
      color_solicitado: createDto.color_solicitado ?? '',
      precio_lista:     createDto.precio_lista    ?? createDto.precio_final,
      descuento_monto:  createDto.descuento_monto  ?? 0,
      precio_final:     createDto.precio_final,
      iva_porcentaje:   createDto.iva_porcentaje   ?? 13,
      iva_monto:        +(createDto.precio_final * ((createDto.iva_porcentaje ?? 13) / 100)).toFixed(2),
      total_con_iva:    +(createDto.precio_final * (1 + (createDto.iva_porcentaje ?? 13) / 100)).toFixed(2),
      fecha_expiracion: fechaExpiracion,
      gasto_marchamo:          createDto.gasto_marchamo          ?? 0,
      gasto_inscripcion:       createDto.gasto_inscripcion       ?? 0,
      gasto_placas:            createDto.gasto_placas            ?? 0,
      gasto_otros:             createDto.gasto_otros             ?? 0,
      gasto_otros_descripcion: createDto.gasto_otros_descripcion ?? '',
      tipo_combustible: createDto.tipo_combustible ?? 'Electrico',
      regalias:        createDto.regalias      ?? '',
      notas_cliente:   createDto.notas_cliente ?? '',
    });

    return this.cotizacionesRepository.save(nuevaCotizacion);
  }

  /**
   * Tarea programada: cada hora revisa cotizaciones vencidas y libera vehículos.
   * Se ejecuta en segundo plano automáticamente.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async liberarCotizacionesVencidas(): Promise<void> {
    const ahora = new Date();
    this.logger.log(`[Scheduler] Revisando cotizaciones vencidas a las ${ahora.toISOString()}`);

    // Buscar cotizaciones activas cuya fecha expiró
    const vencidas = await this.cotizacionesRepository.find({
      where: {
        estado: In(['Borrador', 'Enviada']),
        fecha_expiracion: LessThanOrEqual(ahora),
      },
      relations: ['vehiculo'],
    });

    if (vencidas.length === 0) {
      this.logger.log('[Scheduler] No hay cotizaciones vencidas.');
      return;
    }

    this.logger.log(`[Scheduler] ${vencidas.length} cotización(es) vencida(s) — liberando vehículos.`);

    for (const cot of vencidas) {
      // Cancelar cotización
      await this.cotizacionesRepository.update(cot.id, { estado: 'Cancelada' });

      // Liberar vehículo si sigue Reservado
      if (cot.vehiculo?.id) {
        const v = await this.vehiclesRepository.findOneBy({ id: cot.vehiculo.id });
        if (v?.estado === 'Reservado') {
          await this.vehiclesRepository.update(v.id, { estado: 'Disponible' });
          this.logger.log(`[Scheduler] Vehículo #${v.id} ${v.marca} ${v.modelo} liberado.`);
        }
      }
    }
  }
}
