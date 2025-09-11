import { Controller, Post, Body } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Endpoint público para registrar un nuevo cliente.
   * @param createCustomerDto Datos del nuevo cliente.
   * @returns El cliente creado sin la contraseña.
   */
  @Post('register')
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }
}
