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
import { RolesModule } from './roles/roles.module';
import { Role } from './roles/role.entity';
import { Salario } from './salarios/salario.entity';
import { ReciboPago } from './recibos_pago/recibo_pago.entity';
import { RecibosPagoModule } from './recibos_pago/recibos_pago.module';
import { PlanillaParametrosModule } from './planilla-parametros/planilla-parametros.module';
import { PlanillaParametro } from './planilla-parametros/entities/planilla-parametro.entity';
import { SalariosModule } from './salarios/salarios.module';
import { AuditLog } from './audit-logs/audit-log.entity';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

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
      entities: [
        User,
        Vehicle,
        VehicleImage,
        Role,
        Salario,
        ReciboPago,
        PlanillaParametro,
        AuditLog,
      ], // Aquí irán nuestras "entidades" o modelos de datos más adelante
      synchronize: true, // En desarrollo, esto crea las tablas automáticamente. Lo desactivaremos en producción.
    }),
    UsersModule,
    AuthModule,
    VehiclesModule,
    RolesModule,
    RecibosPagoModule,
    PlanillaParametrosModule,
    SalariosModule,
    AuditLogsModule,
    // --- FIN DE LA CONFIGURACIÓN DE LA BASE DE DATOS ---
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
