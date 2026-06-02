// backend/src/users/users.service.ts
import { Injectable, OnApplicationBootstrap, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Salario } from '../salarios/salario.entity';
import { Role } from '../roles/role.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Salario)
    private salariosRepository: Repository<Salario>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private configService: ConfigService,
  ) {}

  // onApplicationBootstrap se ejecuta DESPUÉS de que todos los módulos
  // (incluyendo RolesService) han terminado su onModuleInit.
  async onApplicationBootstrap() {
    const userCount = await this.usersRepository.count();
    if (userCount > 0) return;

    const adminRole = await this.rolesRepository.findOne({
      where: { nombre: 'Administrador' },
    });

    if (!adminRole) {
      this.logger.error('No se encontró el rol Administrador. No se pudo crear el usuario admin.');
      return;
    }

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@conejomotors.com';
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD') ?? 'password123';

    const adminDto: CreateUserDto = {
      nombre_completo: 'Administrador Principal',
      email: adminEmail,
      contrasena: adminPassword,
      rol_id: adminRole.id,
      salario_base: 500000,
    };

    await this.create(adminDto);
    this.logger.log(`✅ Usuario admin creado: ${adminEmail}`);
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
    // 1. Separamos los datos que son de relaciones de los datos directos del usuario.
    const { rol_id, salario_base, contrasena, ...userData } = updateUserDto;

    // 2. Usamos 'preload' para cargar el usuario y fusionar los datos directos.
    const user = await this.usersRepository.preload({
      id: id,
      ...userData,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID #${id} no encontrado`);
    }

    // 3. Si se proporciona una nueva contraseña, la hasheamos.
    if (contrasena) {
      const salt = await bcrypt.genSalt();
      user.password_hash = await bcrypt.hash(contrasena, salt);
    }

    // 4. Si se proporciona un rol_id, buscamos el rol y lo asignamos.
    if (rol_id) {
      const rol = await this.rolesRepository.findOneBy({ id: rol_id });
      if (rol) {
        user.rol = rol;
      } else {
        throw new NotFoundException(`Rol con ID #${rol_id} no encontrado`);
      }
    }

    // 5. Guardamos los cambios en la entidad del usuario.
    await this.usersRepository.save(user);

    // 6. Si se proporciona un nuevo salario, creamos un nuevo registro de salario.
    //    Esto es bueno para mantener un historial de cambios salariales.
    if (salario_base && salario_base > 0) {
      const newSalario = this.salariosRepository.create({
        usuario: user,
        salario_base: salario_base,
        fecha_efectiva: new Date(),
        comision_porcentaje: 0, // Valor por defecto
      });
      await this.salariosRepository.save(newSalario);
    }

    // 7. Devolvemos el usuario actualizado con todas sus relaciones cargadas.
    return this.usersRepository.findOneOrFail({
      where: { id },
      relations: ['rol'],
    });
  }
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'nombre_completo', 'email', 'activo', 'cedula', 'banco', 'numero_cuenta'],
      relations: ['rol'],
    });
  }

  async findOneByIdFull(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'nombre_completo', 'email', 'activo', 'cedula', 'banco', 'numero_cuenta'],
      relations: ['rol', 'salarios'],
    });
    if (!user) throw new NotFoundException(`Usuario con ID #${id} no encontrado`);
    return user;
  }
}
