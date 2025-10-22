// backend/src/vehicle-profiles/vehicle-profiles.service.ts

import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository,DataSource } from 'typeorm';
import { VehicleProfile } from './vehicle-profile.entity';
import { CreateVehicleProfileDto } from './dto/create-vehicle-profile.dto';
import { UpdateVehicleProfileDto } from './dto/update-vehicle-profile.dto';
import { VehicleProfileImage } from './vehicle-profile-image.entity';


@Injectable()
export class VehicleProfilesService {
  constructor(
    @InjectRepository(VehicleProfile)
    private profileRepository: Repository<VehicleProfile>,
    @InjectRepository(VehicleProfileImage)
    private imagesRepository: Repository<VehicleProfileImage>, // El nombre correcto es 'imagesRepository'
    private dataSource: DataSource 
  ) {}

  async create(createDto: CreateVehicleProfileDto): Promise<VehicleProfile> {
    const newProfile = this.profileRepository.create(createDto);
    return this.profileRepository.save(newProfile);
  }

  async findAll(): Promise<VehicleProfile[]> {
    return this.profileRepository.find();
  }

  async findOne(id: number): Promise<VehicleProfile> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async addImages(profileId: number, imagePaths: string[]): Promise<VehicleProfileImage[]> {
    const profile = await this.profileRepository.findOneBy({ id: profileId });
    if (!profile) {
      throw new NotFoundException(`Perfil con ID #${profileId} no encontrado`);
    }

    const images = imagePaths.map((path) =>
      this.imagesRepository.create({
        url: path.replace(/\\/g, '/'),
        profile: profile,
      }),
    );

    return this.imagesRepository.save(images);
  }

  async reorderProfileImages(profileId: number, imagesOrder: { id: number; order: number }[]): Promise<void> {
    const profile = await this.profileRepository.findOneBy({ id: profileId });
    if (!profile) {
      throw new NotFoundException(`Perfil con ID #${profileId} no encontrado`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Actualiza el orden de cada imagen en una transacción
      for (const imgData of imagesOrder) {
        await queryRunner.manager.update(
          VehicleProfileImage,
          // Asegura que la imagen pertenezca al perfil correcto
          { id: imgData.id, profile: { id: profileId } },
          { order: imgData.order }
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error reordering profile images:", error);
      throw new InternalServerErrorException('Falló la actualización del orden de las imágenes.');
    } finally {
      await queryRunner.release();
    }
  }


  async update(id: number, updateDto: UpdateVehicleProfileDto): Promise<VehicleProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['imagenes'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    const incomingImageIds = updateDto.imagenes?.map(img => img.id).filter(id => id) || [];
    const imagesToDelete = profile.imagenes.filter(img => !incomingImageIds.includes(img.id));

    if (imagesToDelete.length > 0) {
      // --- 👇 CORRECCIÓN AQUÍ 👇 ---
      await this.imagesRepository.remove(imagesToDelete); // Usa 'imagesRepository'
    }

    const newOrUpdatedImages = updateDto.imagenes?.map(imgDto => {
      const existingImage = profile.imagenes.find(img => img.id === imgDto.id);
      if (existingImage) {
        existingImage.url = imgDto.url;
        existingImage.order = imgDto.order;
        return existingImage;
      } else {
        // --- 👇 Y CORRECCIÓN AQUÍ 👇 ---
        return this.imagesRepository.create({ ...imgDto, profile }); // Usa 'imagesRepository'
      }
    }) || [];

    const updatedProfile = this.profileRepository.merge(profile, updateDto);
    updatedProfile.imagenes = newOrUpdatedImages;
    
    return this.profileRepository.save(updatedProfile);
  }

  async remove(id: number): Promise<void> {
    const profile = await this.profileRepository.findOneBy({ id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    // Borrar imágenes primero
    await this.imagesRepository.delete({ profile: { id: id } });
    // Luego borrar el perfil
    await this.profileRepository.remove(profile);
  }
}