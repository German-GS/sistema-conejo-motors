import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
  ) {}

  // Este método busca un cliente por cédula y, si no existe, lo crea.
  async findOrCreate(createClienteDto: CreateClienteDto): Promise<Cliente> {
    let cliente = await this.clientesRepository.findOneBy({
      cedula: createClienteDto.cedula,
    });

    if (!cliente) {
      cliente = this.clientesRepository.create(createClienteDto);
      await this.clientesRepository.save(cliente);
    }

    return cliente;
  }
}
