import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { ClientesService } from '../clientes/clientes.service';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    private clientesService: ClientesService,
  ) {}

  async findMyQuotes(vendedor: User): Promise<Cotizacion[]> {
    return this.cotizacionesRepository.find({
      where: { vendedor: { id: vendedor.id } },
      relations: ['cliente', 'vehiculo'], // Carga la info del cliente y vehículo
      order: { fecha_creacion: 'DESC' }, // Muestra las más recientes primero
    });
  }

  async findOne(id: number): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionesRepository.findOne({
      where: { id },
      // 👇 ASEGÚRATE DE QUE 'vendedor' ESTÉ EN ESTA LISTA 👇
      relations: ['cliente', 'vehiculo', 'vendedor'],
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID #${id} no encontrada.`);
    }
    return cotizacion;
  }

  async create(
    createDto: CreateCotizacionDto,
    vendedor: User,
  ): Promise<Cotizacion> {
    const cliente = await this.clientesService.findOrCreate(createDto.cliente);

    const vehiculo = await this.vehiclesRepository.findOneBy({
      id: createDto.vehiculoId,
    });
    if (!vehiculo) {
      throw new NotFoundException(
        `Vehículo con ID #${createDto.vehiculoId} no encontrado.`,
      );
    }

    const nuevaCotizacion = this.cotizacionesRepository.create({
      ...createDto,
      cliente,
      vehiculo,
      vendedor,
    });

    return this.cotizacionesRepository.save(nuevaCotizacion);
  }
}
