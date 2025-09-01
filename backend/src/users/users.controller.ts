// backend/src/users/users.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users') // Todas las rutas en este archivo empezarán con /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post() // Esto crea un endpoint para peticiones POST a /users
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
