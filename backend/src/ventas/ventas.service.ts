// backend/src/ventas/ventas.service.ts
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
    private notificationsService: NotificationsService,
  ) {}

  async initiateSaleProcess(createVentaDto: CreateVentaDto, vendedor: User): Promise<Cotizacion> {
    const { cotizacionId } = createVentaDto;

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
        `El vehículo ya no está disponible. Estado actual: ${cotizacion.vehiculo.estado}`,
      );
    }

    

    
    await this.vehiclesRepository.update(cotizacion.vehiculo.id, {
      estado: 'Reservado',
    });

    
    await this.cotizacionesRepository.update(cotizacion.id, {
      estado: 'Aceptada',
    });

    const vehicle = cotizacion.vehiculo;
    const message = `Venta de ${vehicle.marca} ${vehicle.modelo} (VIN: ${vehicle.vin}) está lista para ser facturada.`;
    const link = `/admin/billing/pending`; // Futura ruta de facturación
    await this.notificationsService.createForAdmins(message, link);

    
    return cotizacion;
    
   
  }
}