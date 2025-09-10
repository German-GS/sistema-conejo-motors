import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from './cliente.entity';
import { ClientesService } from './clientes.service'; // 👈 1. Importa el servicio

@Module({
  imports: [TypeOrmModule.forFeature([Cliente])],
  providers: [ClientesService], // 👈 2. Añade el servicio a los 'providers'
  exports: [ClientesService], // 👈 3. Exporta el servicio para que otros módulos puedan usarlo
})
export class ClientesModule {}
