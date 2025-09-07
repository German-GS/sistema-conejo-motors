// En: src/vehicles/vehicles.service.ts

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
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(VehicleImage)
    private imagesRepository: Repository<VehicleImage>,
    @InjectRepository(Bodega)
    private bodegasRepository: Repository<Bodega>,
  ) {}

  async getDashboardStats() {
    // 1. Conteo de Vehículos y Cálculo de Valor de Inventario
    const allVehicles = await this.vehiclesRepository.find();

    const totalVehicles = allVehicles.length;

    const inventoryCost = allVehicles.reduce(
      (sum, vehicle) => sum + Number(vehicle.precio_costo),
      0,
    );

    // --- Lógica de Ventas (Simulada por ahora) ---
    // NOTA: Cuando tengas un módulo de ventas, esta lógica se reemplazará
    // con consultas reales a la base de datos.
    const monthlySales = 8; // Valor de ejemplo
    const monthlyRevenue = 450000; // Valor de ejemplo

    // Datos para el gráfico (también simulados)
    const salesData = [
      { month: 'Enero', vendidos: 4 },
      { month: 'Febrero', vendidos: 3 },
      { month: 'Marzo', vendidos: 5 },
      { month: 'Abril', vendidos: 2 },
      { month: 'Mayo', vendidos: 8 },
      { month: 'Junio', vendidos: 6 }, // Mes de ejemplo
    ];

    // Retornamos el objeto con todas las estadísticas
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
    const newVehicle = this.vehiclesRepository.create(vehicleData);

    if (bodegaId) {
      const bodega = await this.bodegasRepository.findOneBy({ id: bodegaId });
      if (bodega) {
        newVehicle.bodega = bodega;
      }
    }
    return this.vehiclesRepository.save(newVehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({ relations: ['bodega', 'imagenes'] });
  }

  async findOne(id: number): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { id },
      relations: ['bodega', 'imagenes'],
    });
  }

  async updateImages(
    vehicleId: number,
    imagesToUpdate: { id: number; order: number }[],
    idsToDelete: number[],
  ) {
    // Usaremos una transacción para asegurar que todas las operaciones se completen
    // o ninguna lo haga si algo falla.
    return this.imagesRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Eliminar las imágenes marcadas para borrado
        if (idsToDelete && idsToDelete.length > 0) {
          await transactionalEntityManager.delete(VehicleImage, idsToDelete);
        }

        // 2. Actualizar el orden de las imágenes restantes
        if (imagesToUpdate && imagesToUpdate.length > 0) {
          // Creamos una promesa para cada actualización
          const updatePromises = imagesToUpdate.map((image) =>
            transactionalEntityManager.update(
              VehicleImage,
              { id: image.id },
              { order: image.order },
            ),
          );
          // Esperamos a que todas las actualizaciones se completen
          await Promise.all(updatePromises);
        }
      },
    );
  }

  async addImages(vehicleId: number, imagePaths: string[]) {
    const vehicle = await this.findOne(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(
        `Vehículo con ID #${vehicleId} no encontrado`,
      );
    }

    // Creamos una entidad VehicleImage por cada ruta de imagen y las guardamos todas
    const images = imagePaths.map((path) =>
      this.imagesRepository.create({
        url: path,
        vehicle: vehicle,
      }),
    );

    return this.imagesRepository.save(images);
  }
  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    // Se extrae el bodegaId y el resto de los datos del DTO
    const { bodegaId, ...vehicleData } = updateVehicleDto;

    // Se precarga el vehículo con los datos básicos
    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...vehicleData,
    });

    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }

    // Se busca y asigna la nueva bodega si se proporcionó un bodegaId
    if (bodegaId !== undefined) {
      if (bodegaId === null) {
        vehicle.bodega = null; // Permite desasignar una bodega
      } else {
        const bodega = await this.bodegasRepository.findOneBy({ id: bodegaId });
        // Solo asignamos si la bodega existe
        if (bodega) {
          vehicle.bodega = bodega;
        }
      }
    }

    // Se guardan todos los cambios y se retorna el vehículo actualizado
    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const result = await this.vehiclesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }
  }
}
