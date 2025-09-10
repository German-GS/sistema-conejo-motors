import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingHistory } from './tracking.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingHistory)
    private trackingHistoryRepository: Repository<TrackingHistory>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(
    vehicleId: number,
    destination: string,
    userId: number,
  ): Promise<TrackingHistory> {
    const vehicle = await this.vehicleRepository.findOneBy({ id: vehicleId });
    if (!vehicle) {
      throw new Error('Vehículo no encontrado');
    }

    const newLog = this.trackingHistoryRepository.create({
      vehicle,
      origin: vehicle.currentLocation,
      destination,
      departureUser: { id: userId } as any,
    });

    await this.trackingHistoryRepository.save(newLog);

    vehicle.currentLocation = destination;
    await this.vehicleRepository.save(vehicle);

    return newLog;
  }

  async getLatestLogForVehicle(vehicleId: number): Promise<TrackingHistory> {
    const log = await this.trackingHistoryRepository.findOne({
      where: { vehicle: { id: vehicleId } },
      order: { departureTime: 'DESC' },
      relations: {
        vehicle: true,
        departureUser: true,
      },
    });

    if (!log) {
      // Si no se encuentra un log, lanza una excepción
      throw new NotFoundException(
        `No se encontraron registros de rastreo para el vehículo con ID ${vehicleId}`,
      );
    }

    return log;
  }
}
