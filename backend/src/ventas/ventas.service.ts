import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    // --- 👇 1. INYECTA EL SERVICIO DE NOTIFICACIONES AQUÍ 👇 ---
    private notificationsService: NotificationsService,
  ) {}

  async create(createVentaDto: CreateVentaDto, vendedor: User): Promise<Venta> {
    const { cotizacionId, metodo_pago } = createVentaDto;

    const cotizacion = await this.cotizacionesRepository.findOne({
      where: { id: cotizacionId },
      relations: ['cliente', 'vehiculo', 'vendedor'],
    });

    if (!cotizacion) {
      throw new NotFoundException(
        `Cotización con ID #${cotizacionId} no encontrada.`,
      );
    }

    if (cotizacion.vehiculo.estado !== 'Disponible') {
      throw new BadRequestException(
        `El vehículo ya no está disponible para la venta.`,
      );
    }

    await this.vehiclesRepository.update(cotizacion.vehiculo.id, {
      estado: 'Vendido',
    });
    await this.cotizacionesRepository.update(cotizacion.id, {
      estado: 'Aceptada',
    });

    const ventaCreada = this.ventasRepository.create({
      metodo_pago,
      monto_final: cotizacion.precio_final,
      cotizacion,
      vendedor,
    });

    // --- 👇 2. GUARDA LA VENTA EN UNA NUEVA VARIABLE 👇 ---
    const ventaGuardada = await this.ventasRepository.save(ventaCreada);

    // --- 👇 3. LLAMA AL SERVICIO DE NOTIFICACIONES 👇 ---
    const vehicle = cotizacion.vehiculo;
    const message = `Vehículo ${vehicle.marca} ${vehicle.modelo} (VIN: ${vehicle.vin}) vendido. Factura pendiente.`;
    const link = `/admin/sales/quotes/${cotizacion.id}`;
    await this.notificationsService.createForAdmins(message, link);

    return ventaGuardada;
  }
}
