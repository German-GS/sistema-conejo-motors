import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleProfile } from './vehicle-profile.entity';
import { CreateVehicleProfileDto } from './dto/create-vehicle-profile.dto';

@Injectable()
export class VehicleProfilesService {
  constructor(
    @InjectRepository(VehicleProfile)
    private profilesRepository: Repository<VehicleProfile>,
  ) {}

  findAll(): Promise<VehicleProfile[]> {
    return this.profilesRepository.find({
      order: { marca: 'ASC', modelo: 'ASC' },
    });
  }

  // 👇 AHORA ACEPTA LA RUTA DEL LOGO COMO PARÁMETRO OPCIONAL 👇
  create(
    createDto: CreateVehicleProfileDto,
    logoPath?: string,
  ): Promise<VehicleProfile> {
    const profile = this.profilesRepository.create({
      ...createDto,
      logo_url: logoPath, // Asigna la ruta del logo
    });
    return this.profilesRepository.save(profile);
  }

  async remove(id: number): Promise<void> {
    const result = await this.profilesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Perfil de vehículo con ID #${id} no encontrado.`,
      );
    }
  }
}
