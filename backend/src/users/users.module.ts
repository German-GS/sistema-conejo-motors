// backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Salario } from '../salarios/salario.entity'; // 👈 1. IMPORTAR SALARIO
import { Role } from '../roles/role.entity'; // 👈 2. IMPORTAR ROL

@Module({
  // 👇 3. AÑADIR SALARIO Y ROL A ESTA LISTA
  imports: [TypeOrmModule.forFeature([User, Salario, Role])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
