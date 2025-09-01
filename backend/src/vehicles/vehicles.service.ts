import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleImage } from './vehicle-image.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(VehicleImage)
    private imagesRepository: Repository<VehicleImage>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const newVehicle = this.vehiclesRepository.create(createVehicleDto);
    return this.vehiclesRepository.save(newVehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find();
  }

  async findOne(id: number): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOneBy({ id });
  }

  async addImage(vehicleId: number, imagePath: string) {
    const vehicle = await this.findOne(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(
        `Vehículo con ID #${vehicleId} no encontrado`,
      );
    }

    const newImage = this.imagesRepository.create({
      url: imagePath,
      vehicle: vehicle,
    });

    return this.imagesRepository.save(newImage);
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    // Primero, intenta precargar el vehículo existente con los nuevos datos
    const vehicle = await this.vehiclesRepository.preload({
      id: id,
      ...updateVehicleDto,
    });

    // Si el vehículo con ese ID no existe, lanza un error 404
    if (!vehicle) {
      throw new NotFoundException(
        `El vehículo con el ID #${id} no fue encontrado`,
      );
    }

    // Si existe, guarda los cambios y lo devuelve
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
