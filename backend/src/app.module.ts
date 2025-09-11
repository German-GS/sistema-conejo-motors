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
import { Bodega } from './bodegas/bodega.entity';
import { BodegasModule } from './bodegas/bodegas.module';
import { TrackingModule } from './tracking/tracking.module';
import { TrackingHistory } from './tracking/tracking.entity';
import { ClientesModule } from './clientes/clientes.module';
import { Cliente } from './clientes/cliente.entity';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { Cotizacion } from './cotizaciones/cotizacion.entity';
import { VentasModule } from './ventas/ventas.module';
import { Venta } from './ventas/venta.entity';
import { ConfigModule } from '@nestjs/config';
import { VehicleProfile } from './vehicle-profiles/vehicle-profile.entity';
import { VehicleProfilesModule } from './vehicle-profiles/vehicle-profiles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/notification.entity';
import { ReportsModule } from './reports/reports.module';
import { Lead } from './leads/lead.entity';
import { LeadsModule } from './leads/leads.module';
import { Customer } from './customers/customer.entity';
import { CustomersModule } from './customers/customers.module';
import { SiteSetting } from './site-settings/site-setting.entity';
import { SiteSettingsModule } from './site-settings/site-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
        Bodega,
        TrackingHistory,
        Cliente,
        Cotizacion,
        Venta,
        VehicleProfile,
        Notification,
        Lead,
        Customer,
        SiteSetting,
      ],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    VehiclesModule,
    RolesModule,
    RecibosPagoModule,
    PlanillaParametrosModule,
    SalariosModule,
    AuditLogsModule,
    BodegasModule,
    TrackingModule,
    ClientesModule,
    CotizacionesModule,
    VentasModule,
    VehicleProfilesModule,
    NotificationsModule,
    ReportsModule,
    LeadsModule,
    CustomersModule,
    SiteSettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
