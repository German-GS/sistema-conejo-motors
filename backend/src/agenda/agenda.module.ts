import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cita])],
  controllers: [AgendaController],
  providers: [AgendaService],
  exports: [AgendaService],
})
export class AgendaModule {}
