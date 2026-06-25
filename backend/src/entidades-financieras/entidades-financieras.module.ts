import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntidadFinanciera } from './entidad-financiera.entity';
import { EntidadFinancieraDocumento } from './entidad-financiera-documento.entity';
import { EntidadesFinancierasController } from './entidades-financieras.controller';
import { EntidadesFinancierasService } from './entidades-financieras.service';

@Module({
  imports: [TypeOrmModule.forFeature([EntidadFinanciera, EntidadFinancieraDocumento])],
  controllers: [EntidadesFinancierasController],
  providers: [EntidadesFinancierasService],
})
export class EntidadesFinancierasModule {}
