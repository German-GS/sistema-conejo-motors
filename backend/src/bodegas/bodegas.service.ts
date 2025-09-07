import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bodega } from './bodega.entity';
import { CreateBodegaDto } from './dto/create-bodega.dto';

@Injectable()
export class BodegasService {
  constructor(
    @InjectRepository(Bodega)
    private bodegasRepository: Repository<Bodega>,
  ) {}

  create(createBodegaDto: CreateBodegaDto): Promise<Bodega> {
    const bodega = this.bodegasRepository.create(createBodegaDto);
    return this.bodegasRepository.save(bodega);
  }

  findAll(): Promise<Bodega[]> {
    return this.bodegasRepository.find();
  }
}
