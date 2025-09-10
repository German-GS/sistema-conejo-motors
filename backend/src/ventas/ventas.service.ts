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

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
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

    const nuevaVenta = this.ventasRepository.create({
      metodo_pago,
      monto_final: cotizacion.precio_final,
      cotizacion,
      vendedor,
    });

    return this.ventasRepository.save(nuevaVenta);
  }
}
