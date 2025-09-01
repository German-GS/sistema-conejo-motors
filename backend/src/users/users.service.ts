// backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  // Inyectamos el "repositorio" de la entidad User para poder interactuar con la tabla 'usuarios'
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Función para crear un nuevo usuario
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 1. Encriptamos la contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.contrasena, salt);

    // 2. Creamos una nueva instancia del usuario con los datos del DTO
    const newUser = this.usersRepository.create({
      nombre_completo: createUserDto.nombre_completo,
      email: createUserDto.email,
      password_hash: hashedPassword, // Guardamos la contraseña encriptada
    });

    // 3. Guardamos el nuevo usuario en la base de datos
    return this.usersRepository.save(newUser);
  }
}
