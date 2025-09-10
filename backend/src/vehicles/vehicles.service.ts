import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleImage } from './vehicle-image.entity';
import { Bodega } from '../bodegas/bodega.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(VehicleImage)
    private readonly imagesRepository: Repository<VehicleImage>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
  ) {}

  async getDashboardStats() {
    const allVehicles = await this.vehiclesRepository.find();
    const totalVehicles = allVehicles.length;

    const inventoryCost = allVehicles.reduce(
      (sum, vehicle) => sum + Number(vehicle.precio_costo || 0),
      0,
    );

    // --- Lógica de Ventas (Simulada por ahora) ---
    const monthlySales = 8;
    const monthlyRevenue = 450000;
    const salesData = [
      { month: 'Enero', vendidos: 4 },
      { month: 'Febrero', vendidos: 3 },
      { month: 'Marzo', vendidos: 5 },
      { month: 'Abril', vendidos: 2 },
      { month: 'Mayo', vendidos: 8 },
      { month: 'Junio', vendidos: 6 },
    ];

    return {
      totalVehicles,
      inventoryCost,
      monthlySales,
      monthlyRevenue,
      salesData,
    };
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const { bodegaId, ...vehicleData } = createVehicleDto;

    let bodega: Bodega | null = null;
    let currentLocation: string | undefined = undefined;

    // 1. Buscamos la bodega SOLO si se proporcionó un bodegaId
    if (bodegaId) {
      bodega = await this.bodegaRepository.findOneBy({ id: bodegaId });
      if (!bodega) {
        throw new NotFoundException(
          `La bodega con el ID #${bodegaId} no fue encontrada.`,
        );
      }
      currentLocation = bodega.nombre;
    } else {
      // Si no se asigna bodega, buscamos la primera disponible como ubicación inicial
      const firstBodega = await this.bodegaRepository.findOne({
        order: { id: 'ASC' },
      });
      if (firstBodega) {
        currentLocation = firstBodega.nombre;
      } else {
        // Si no hay ninguna bodega en el sistema, la ubicación puede ser algo genérico
        currentLocation = 'En Tránsito';
      }
    }

    const newVehicle = this.vehiclesRepository.create({
      ...vehicleData,
      currentLocation: currentLocation,
      bodega: bodega, // Asigna la entidad Bodega encontrada o null
    });

    return this.vehiclesRepository.save(newVehicle);
  }

  async findCatalog(): Promise<Omit<Vehicle, 'precio_costo'>[]> {
    const vehicles = await this.vehiclesRepository.find({
      where: { estado: 'Disponible' },
      relations: ['bodega', 'imagenes'], // <-- CORREGIDO
    });
    // El resto del método está bien
    return vehicles.map(({ precio_costo, ...vehicle }) => vehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({ relations: ['bodega', 'imagenes'] }); // <-- CORREGIDO
  }

  async findOne(id: number): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { id },
      relations: ['bodega', 'imagenes'], // <-- CORREGIDO
    });
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const { bodegaId, ...vehicleData } = updateVehicleDto;

    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...vehicleData,
    });

    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }

    if (bodegaId !== undefined) {
      if (bodegaId === null) {
        vehicle.bodega = null;
      } else {
        const bodega = await this.bodegaRepository.findOneBy({ id: bodegaId });
        if (bodega) {
          vehicle.bodega = bodega;
        } else {
          throw new NotFoundException(
            `La bodega con el ID #${bodegaId} no fue encontrada`,
          );
        }
      }
    }

    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const vehicle = await this.findOne(id);
    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }
    await this.vehiclesRepository.remove(vehicle);
  }

  async addImages(vehicleId: number, imagePaths: string[]) {
    const vehicle = await this.findOne(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(
        `Vehículo con ID #${vehicleId} no encontrado`,
      );
    }

    const images = imagePaths.map((path) =>
      this.imagesRepository.create({
        url: path,
        vehicle: vehicle,
      }),
    );

    return this.imagesRepository.save(images);
  }

  async updateImages(
    vehicleId: number,
    imagesToUpdate: { id: number; order: number }[],
    idsToDelete: number[],
  ) {
    return this.imagesRepository.manager.transaction(
      async (transactionalEntityManager) => {
        if (idsToDelete && idsToDelete.length > 0) {
          await transactionalEntityManager.delete(VehicleImage, idsToDelete);
        }

        if (imagesToUpdate && imagesToUpdate.length > 0) {
          const updatePromises = imagesToUpdate.map((image) =>
            transactionalEntityManager.update(
              VehicleImage,
              { id: image.id },
              { order: image.order },
            ),
          );
          await Promise.all(updatePromises);
        }
      },
    );
  }
}
