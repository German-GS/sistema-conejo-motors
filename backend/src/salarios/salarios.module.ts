// backend/src/salarios/salarios.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Salario } from './salario.entity';
import { User } from '../users/user.entity';
import { SalariosService } from './salarios.service';
import { SalariosController } from './salarios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Salario, User])],
  providers: [SalariosService],
  controllers: [SalariosController],
})
export class SalariosModule {}
