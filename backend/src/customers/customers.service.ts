import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  /**
   * Busca un cliente por su correo electrónico.
   * @param email El email del cliente a buscar.
   * @returns El cliente si se encuentra, de lo contrario null.
   */
  async findOneByEmail(email: string): Promise<Customer | null> {
    return this.customersRepository.findOneBy({ email });
  }

  /**
   * Crea un nuevo cliente en la base de datos.
   * @param createCustomerDto Los datos para crear el nuevo cliente.
   * @returns El objeto del cliente creado, sin el hash de la contraseña.
   */
  async create(
    createCustomerDto: CreateCustomerDto,
  ): Promise<Omit<Customer, 'password_hash'>> {
    const { email, contrasena, nombre_completo } = createCustomerDto;

    // 1. Verificar si el email ya existe para evitar duplicados.
    const existingCustomer = await this.findOneByEmail(email);
    if (existingCustomer) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    // 2. Hashear la contraseña antes de guardarla.
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // 3. Crear y guardar la nueva entidad de cliente.
    const newCustomer = this.customersRepository.create({
      email,
      nombre_completo,
      password_hash: hashedPassword,
    });

    const savedCustomer = await this.customersRepository.save(newCustomer);

    // 4. Devolver el cliente sin el hash de la contraseña por seguridad.
    const { password_hash, ...result } = savedCustomer;
    return result;
  }
}
