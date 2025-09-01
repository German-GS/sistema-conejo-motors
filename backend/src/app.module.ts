import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { Vehicle } from './vehicles/vehicle.entity';
import { VehicleImage } from './vehicles/vehicle-image.entity';

@Module({
  imports: [
    // --- INICIO DE LA CONFIGURACIÓN DE LA BASE DE DATOS ---
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // O '127.0.0.1'
      port: 5432,
      username: 'admin', // El usuario que definimos en docker-compose.yml
      password: 'password123', // La contraseña que definimos en docker-compose.yml
      database: 'conejo_motors_dev', // El nombre de la BD que definimos en docker-compose.yml
      entities: [User, Vehicle, VehicleImage], // Aquí irán nuestras "entidades" o modelos de datos más adelante
      synchronize: true, // En desarrollo, esto crea las tablas automáticamente. Lo desactivaremos en producción.
    }),
    UsersModule,
    AuthModule,
    VehiclesModule,
    // --- FIN DE LA CONFIGURACIÓN DE LA BASE DE DATOS ---
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
