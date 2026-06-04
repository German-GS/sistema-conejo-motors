import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { Vehicle } from './vehicles/vehicle.entity';
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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VehicleProfile } from './vehicle-profiles/vehicle-profile.entity';
import { VehicleProfilesModule } from './vehicle-profiles/vehicle-profiles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/notification.entity';
import { ReportsModule } from './reports/reports.module';
import { Lead } from './leads/lead.entity';
import { LeadActividad } from './leads/lead-actividad.entity';
import { LeadsModule } from './leads/leads.module';
// CustomersModule desactivado — era un duplicado de ClientesModule (portal web sin uso)
// import { Customer } from './customers/customer.entity';
// import { CustomersModule } from './customers/customers.module';
import { SiteSetting } from './site-settings/site-setting.entity';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { Factura } from './facturacion/factura.entity';
import { FacturacionModule } from './facturacion/facturacion.module';
import { VehicleProfileImage } from './vehicle-profiles/vehicle-profile-image.entity';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AccesoriosModule } from './accesorios/accesorios.module';
import { AccesorioVehiculo } from './accesorios/accesorio.entity';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { Asistencia } from './asistencia/asistencia.entity';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { Solicitud } from './solicitudes/solicitud.entity';
import { ChatModule } from './chat/chat.module';
import { ChatMensaje } from './chat/chat.entity';
import { ProductosModule } from './productos/productos.module';
import { Producto } from './productos/producto.entity';
import { OrdenProducto, LineaOrden } from './productos/orden-producto.entity';
import { ContabilidadModule } from './contabilidad/contabilidad.module';
import { CuentaContable } from './contabilidad/cuenta.entity';
import { AsientoContable, LineaAsiento } from './contabilidad/asiento.entity';
import { CierreDiario } from './contabilidad/cierre-diario.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development.local', '.env.development'],
    }),
    // --- CONFIGURACIÓN DE LA BASE DE DATOS (usa variables de entorno) ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('DB_HOST', 'localhost'),
        port:     config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'admin'),
        password: config.get<string>('DB_PASSWORD', 'password123'),
        database: config.get<string>('DB_NAME', 'conejo_motors_dev'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production', // false en prod
        entities: [
        User,
        Vehicle,
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
        LeadActividad,
        SiteSetting,
        Factura,
        VehicleProfileImage,
        AccesorioVehiculo,
        Asistencia,
        Solicitud,
        ChatMensaje,
        Producto,
        OrdenProducto,
        LineaOrden,
        CuentaContable,
        AsientoContable,
        LineaAsiento,
        CierreDiario,
      ],
      }),
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
    // CustomersModule, // desactivado — duplicado de ClientesModule
    SiteSettingsModule,
    FacturacionModule,
    AccesoriosModule,
    AsistenciaModule,
    SolicitudesModule,
    ChatModule,
    ProductosModule,
    ContabilidadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
