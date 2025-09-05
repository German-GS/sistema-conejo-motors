// backend/src/users/users.service.ts
import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Salario } from '../salarios/salario.entity';
import { Role } from '../roles/role.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Salario)
    private salariosRepository: Repository<Salario>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    // Esta función creará el admin si la base de datos está vacía
    const userCount = await this.usersRepository.count();
    if (userCount === 0) {
      console.log('Base de datos de usuarios vacía, creando administrador...');
      const adminDto: CreateUserDto = {
        nombre_completo: 'Administrador Principal',
        email: 'admin@conejomotors.com',
        contrasena: 'password123',
      };
      await this.create(adminDto);
      console.log(
        `Usuario administrador creado con el email: ${adminDto.email}`,
      );
    }
  }

  // --- NUEVO MÉTODO AÑADIDO ---
  async findOneById(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID #${id} no encontrado`);
    }
    return user;
  }
  // -----------------------------

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['rol'],
    });
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password_hash'>> {
    const { contrasena, salario_base, rol_id, ...userData } = createUserDto;

    // Hashear contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    const newUser = this.usersRepository.create({
      ...userData,
      password_hash: hashedPassword,
    });

    // Asignar rol si se proporciona
    if (rol_id) {
      const rol = await this.rolesRepository.findOneBy({ id: rol_id });
      if (rol) {
        newUser.rol = rol;
      }
    }

    // Guardar el nuevo usuario
    const savedUser = await this.usersRepository.save(newUser);

    // Si se proporcionó un salario, crear el registro de salario
    if (salario_base && salario_base > 0) {
      const newSalario = this.salariosRepository.create({
        usuario: savedUser,
        salario_base: salario_base,
        fecha_efectiva: new Date(),
        comision_porcentaje: 0, // Valor por defecto
      });
      await this.salariosRepository.save(newSalario);
    }

    // Devolver el usuario sin el hash de la contraseña
    const { password_hash, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Usuario con ID #${id} no encontrado`);
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.contrasena) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password_hash = await bcrypt.hash(
        updateUserDto.contrasena,
        salt,
      );
      delete updateUserDto.contrasena;
    }
    await this.usersRepository.update(id, updateUserDto);
    const updatedUser = await this.usersRepository.findOneBy({ id });
    if (!updatedUser) {
      throw new NotFoundException(`Usuario con ID #${id} no encontrado`);
    }
    return updatedUser;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'nombre_completo', 'email', 'activo'],
    });
  }
}
