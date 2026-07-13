import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cabys } from './cabys.entity';
import { CabysService } from './cabys.service';
import { CabysController } from './cabys.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cabys])],
  controllers: [CabysController],
  providers: [CabysService],
  exports: [CabysService],
})
export class CabysModule {}
