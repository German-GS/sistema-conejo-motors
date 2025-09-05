// backend/src/salarios/salarios.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salario } from './salario.entity';
import { CreateSalarioDto } from './dto/create-salario.dto';
import { User } from '../users/user.entity';

@Injectable()
export class SalariosService {
  constructor(
    @InjectRepository(Salario)
    private salariosRepository: Repository<Salario>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createSalarioDto: CreateSalarioDto): Promise<Salario> {
    const { usuarioId, salario_base, fecha_efectiva } = createSalarioDto;

    const usuario = await this.usersRepository.findOneBy({ id: usuarioId });
    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID #${usuarioId} no encontrado.`,
      );
    }

    const nuevoSalario = this.salariosRepository.create({
      salario_base,
      fecha_efectiva,
      usuario,
      // La comisión la dejamos en 0 por ahora, se puede expandir a futuro
      comision_porcentaje: 0,
    });

    return this.salariosRepository.save(nuevoSalario);
  }
}
