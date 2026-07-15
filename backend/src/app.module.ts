import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { Venta } from './ventas/venta.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VehicleProfile } from './vehicle-profiles/vehicle-profile.entity';
import { VehicleProfilesModule } from './vehicle-profiles/vehicle-profiles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/notification.entity';
import { ReportsModule } from './reports/reports.module';
import { CierreMes } from './reports/cierre-mes.entity';
import { Lead } from './leads/lead.entity';
import { LeadActividad } from './leads/lead-actividad.entity';
import { LeadDocumento } from './leads/lead-documento.entity';
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
import { ActivosFijosModule } from './activos-fijos/activos-fijos.module';
import { DepreciacionModule } from './depreciacion/depreciacion.module';
import { IvaModule } from './iva/iva.module';
import { PendientesContablesModule } from './pendientes-contables/pendientes-contables.module';
import { CabysModule } from './cabys/cabys.module';
import { TipoCambioModule } from './tipo-cambio/tipo-cambio.module';
import { NotasFiscalesModule } from './notas-fiscales/notas-fiscales.module';
import { CuentaContable } from './contabilidad/cuenta.entity';
import { AsientoContable, LineaAsiento } from './contabilidad/asiento.entity';
import { CierreDiario } from './contabilidad/cierre-diario.entity';
// Nuevos módulos
import { AgendaModule } from './agenda/agenda.module';
import { Cita } from './agenda/cita.entity';
import { CosteoVehiculosModule } from './costeo-vehiculos/costeo-vehiculos.module';
import { CosteoVehiculo } from './costeo-vehiculos/costeo-vehiculo.entity';
import { ImportacionesModule } from './importaciones/importaciones.module';
import { Importacion } from './importaciones/importacion.entity';
import { ImportacionVehiculo } from './importaciones/importacion-vehiculo.entity';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { Proveedor } from './proveedores/proveedor.entity';
import { ComprasModule } from './compras/compras.module';
import { OrdenCompra } from './compras/orden-compra.entity';
import { LineaCompra } from './compras/linea-compra.entity';
import { CxcModule } from './cxc/cxc.module';
import { CuentaCobrar } from './cxc/cuenta-cobrar.entity';
import { PagoCxC } from './cxc/pago-cxc.entity';
import { CxpModule } from './cxp/cxp.module';
import { CuentaPagar } from './cxp/cuenta-pagar.entity';
import { PagoCxP } from './cxp/pago-cxp.entity';
import { CajaChicaModule } from './caja-chica/caja-chica.module';
import { CajaChica } from './caja-chica/caja-chica.entity';
import { MovimientoCaja } from './caja-chica/movimiento-caja.entity';
import { GastosModule } from './gastos/gastos.module';
import { Gasto } from './gastos/gasto.entity';
import { TallerModule } from './taller/taller.module';
import { OrdenTrabajo } from './taller/orden-trabajo.entity';
import { DetalleTaller } from './taller/detalle-taller.entity';
import { GarantiasModule } from './garantias/garantias.module';
import { Garantia } from './garantias/garantia.entity';
import { ReclamoGarantia } from './garantias/reclamo-garantia.entity';
import { TesoreriaModule } from './tesoreria/tesoreria.module';
import { CuentaBancaria } from './tesoreria/cuenta-bancaria.entity';
import { SearchModule } from './search/search.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { MovimientoBancario } from './tesoreria/movimiento-bancario.entity';
import { CampanasModule } from './campanas/campanas.module';
import { Campana } from './campanas/campana.entity';
import { EntidadesFinancierasModule } from './entidades-financieras/entidades-financieras.module';
import { EntidadFinanciera } from './entidades-financieras/entidad-financiera.entity';
import { EntidadFinancieraDocumento } from './entidades-financieras/entidad-financiera-documento.entity';
import { SugefModule } from './sugef/sugef.module';
import { LeadSugefKyc } from './sugef/lead-sugef-kyc.entity';
import { LeadSugefRetencion } from './sugef/lead-sugef-retencion.entity';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Rate limiting: límite global generoso (no afecta el uso normal); los endpoints
    // sensibles (login, recuperación) llevan límites estrictos con @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
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
        // Esquema ya aplicado (creado por synchronize en despliegues previos). A partir de
        // acá los cambios de esquema van por MIGRACIONES (ver src/migrations + data-source.ts).
        // No se auto-ejecutan en el arranque; se corren con la CLI (npm run migration:run).
        synchronize: false,
        migrations: [__dirname + '/migrations/*.{js,ts}'],
        migrationsTableName: 'migrations_history',
        migrationsRun: false,
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
        LeadDocumento,
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
        // Nuevas entidades
        Cita,
        CosteoVehiculo,
        Importacion,
        ImportacionVehiculo,
        Proveedor,
        OrdenCompra,
        LineaCompra,
        CuentaCobrar,
        PagoCxC,
        CuentaPagar,
        PagoCxP,
        CajaChica,
        MovimientoCaja,
        Gasto,
        OrdenTrabajo,
        DetalleTaller,
        Garantia,
        ReclamoGarantia,
        CuentaBancaria,
        MovimientoBancario,
        CierreMes,
        Campana,
        EntidadFinanciera,
        EntidadFinancieraDocumento,
        LeadSugefKyc,
        LeadSugefRetencion,
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
    ActivosFijosModule,
    DepreciacionModule,
    IvaModule,
    PendientesContablesModule,
    CabysModule,
    TipoCambioModule,
    NotasFiscalesModule,
    // Nuevos módulos
    AgendaModule,
    CosteoVehiculosModule,
    ImportacionesModule,
    ProveedoresModule,
    ComprasModule,
    CxcModule,
    CxpModule,
    CajaChicaModule,
    GastosModule,
    TallerModule,
    GarantiasModule,
    TesoreriaModule,
    SearchModule,
    FinanzasModule,
    CampanasModule,
    EntidadesFinancierasModule,
    SugefModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica el rate limiting globalmente (por IP).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
