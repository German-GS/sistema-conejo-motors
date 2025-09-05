// backend/src/salarios/salarios.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalariosService } from './salarios.service';
import { CreateSalarioDto } from './dto/create-salario.dto';

@Controller('salarios')
@UseGuards(AuthGuard('jwt'))
export class SalariosController {
  constructor(private readonly salariosService: SalariosService) {}

  @Post()
  create(@Body() createSalarioDto: CreateSalarioDto) {
    return this.salariosService.create(createSalarioDto);
  }
}
