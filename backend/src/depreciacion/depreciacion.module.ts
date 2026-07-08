import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaDepreciacion } from './categoria-depreciacion.entity';
import { DepreciacionService } from './depreciacion.service';
import { DepreciacionController } from './depreciacion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaDepreciacion])],
  controllers: [DepreciacionController],
  providers: [DepreciacionService],
  exports: [DepreciacionService],
})
export class DepreciacionModule {}
