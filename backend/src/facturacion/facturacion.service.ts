// backend/src/facturacion/facturacion.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Venta } from '../ventas/venta.entity';
import { Factura } from './factura.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { CryptoService } from './crypto.service';
import { XmlGeneratorService } from './xml-generator.service';

@Injectable()
export class FacturacionService {
  constructor(
    @InjectRepository(Cotizacion) private readonly cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Venta) private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(Factura) private readonly facturasRepository: Repository<Factura>,
    @InjectRepository(Vehicle) private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly xmlGenerator: XmlGeneratorService,
    private readonly cryptoService: CryptoService,
  ) {}

  async getPendingInvoices(): Promise<Cotizacion[]> {
    return this.cotizacionesRepository.find({
      where: { estado: 'Aceptada' },
      relations: ['cliente', 'vehiculo', 'vendedor'],
    });
  }

  async createInvoiceForSale(cotizacionId: number, adminUser: any): Promise<Venta> {
    const cotizacion = await this.cotizacionesRepository.findOne({
      where: { id: cotizacionId },
      relations: ['cliente', 'vehiculo', 'vendedor'],
    });

    if (!cotizacion || cotizacion.estado !== 'Aceptada') {
      throw new NotFoundException(`Cotización #${cotizacionId} no está lista para facturar.`);
    }

    // --- FLUJO DE FACTURACIÓN SIMULADO ---

    // 1. Generar el XML v4.4 (esto sigue igual)
    const xmlSinFirma = await this.xmlGenerator.generateXml(cotizacion);
    
    // 2. "Firmar" el XML (ahora usará nuestra función simulada)
    const xmlFirmadoBase64 = await this.cryptoService.signXml(xmlSinFirma);

    // 3. Omitimos el envío a Hacienda.
    console.log('--- MODO SIMULACIÓN: Omitiendo envío a Hacienda ---');
    
    // 4. Extraer datos clave para guardar en la BD (esto sigue igual)
    const payload = await this.xmlGenerator.buildPayload(cotizacion);
    const { Clave: clave_numerica, NumeroConsecutivo: consecutivo } = payload.FacturaElectronica;

    // --- FIN DEL FLUJO SIMULADO ---

    const transactionResult = await this.ventasRepository.manager.transaction(async (manager) => {
        const nuevaVenta = manager.create(Venta, {
            cotizacion,
            vendedor: cotizacion.vendedor,
            monto_final: cotizacion.precio_final,
            metodo_pago: 'Facturado',
        });
        await manager.save(nuevaVenta);

        const nuevaFactura = manager.create(Factura, {
            clave_numerica,
            consecutivo,
            // Guardamos el XML "firmado" simulado
            xml_enviado: xmlFirmadoBase64,
            // Dejamos la respuesta como simulada y el estado en Procesando
            xml_respuesta: '<RespuestaSimulada>Aceptado</RespuestaSimulada>', 
            estado: 'Procesando', // Puedes usar 'Procesando' o un estado custom como 'Simulado'
            venta: nuevaVenta,
        });
        await manager.save(nuevaFactura);

        // Marcamos el vehículo como Vendido
        await manager.update(Vehicle, cotizacion.vehiculo.id, { estado: 'Vendido' });

        await manager.update(Cotizacion, cotizacion.id, { estado: 'Facturada' });
        
        return nuevaVenta;
    });
    
    return transactionResult;
  }
}


//**************************************************************/
//        Facturacion con logica para conectar con tribu-cr    */
//************************************************************ */

// backend/src/facturacion/facturacion.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { HttpService } from '@nestjs/axios';
// import { ConfigService } from '@nestjs/config';
// import { Cotizacion } from '../cotizaciones/cotizacion.entity';
// import { Venta } from '../ventas/venta.entity';
// import { Factura } from './factura.entity';
// import { Vehicle } from '../vehicles/vehicle.entity';

// // --- 👇 1. Importa los nuevos servicios 👇 ---
// import { CryptoService } from './crypto.service';
// import { XmlGeneratorService } from './xml-generator.service';

// @Injectable()
// export class FacturacionService {
//   constructor(
//     @InjectRepository(Cotizacion) private readonly cotizacionesRepository: Repository<Cotizacion>,
//     @InjectRepository(Venta) private readonly ventasRepository: Repository<Venta>,
//     @InjectRepository(Factura) private readonly facturasRepository: Repository<Factura>,
//     @InjectRepository(Vehicle) private readonly vehiclesRepository: Repository<Vehicle>,
//     private readonly httpService: HttpService,
//     private readonly configService: ConfigService,
//     // --- 👇 2. Inyéctalos en el constructor 👇 ---
//     private readonly xmlGenerator: XmlGeneratorService,
//     private readonly cryptoService: CryptoService,
//   ) {}

//   async getPendingInvoices(): Promise<Cotizacion[]> {
//     return this.cotizacionesRepository.find({
//         where: { estado: 'Aceptada' },
//         relations: ['cliente', 'vehiculo', 'vendedor'],
//     });
//   }

//   async createInvoiceForSale(cotizacionId: number, adminUser: any): Promise<Venta> {
//     const cotizacion = await this.cotizacionesRepository.findOne({
//       where: { id: cotizacionId },
//       relations: ['cliente', 'vehiculo', 'vendedor'],
//     });

//     if (!cotizacion || cotizacion.estado !== 'Aceptada') {
//       throw new NotFoundException(`Cotización #${cotizacionId} no está lista para facturar.`);
//     }

//     // --- ✨ INICIA EL NUEVO FLUJO DE FACTURACIÓN ✨ ---

//     // 1. Generar el XML v4.4
//     const xmlSinFirma = await this.xmlGenerator.generateXml(cotizacion);
    
//     // 2. Firmar el XML con la Llave Criptográfica
//     const xmlFirmadoBase64 = await this.cryptoService.signXml(xmlSinFirma);

//     // 3. (Futuro) Obtener Token de Acceso y enviar a Hacienda
    
//     // 4. Extraer datos clave para guardar en la BD
//     const payload = await this.xmlGenerator.buildPayload(cotizacion);
//     const { Clave: clave_numerica, NumeroConsecutivo: consecutivo } = payload.FacturaElectronica;

//     // --- FIN DEL NUEVO FLUJO ---

//     const transactionResult = await this.ventasRepository.manager.transaction(async (manager) => {
//         const nuevaVenta = manager.create(Venta, {
//             cotizacion,
//             vendedor: cotizacion.vendedor,
//             monto_final: cotizacion.precio_final,
//             metodo_pago: 'Facturado',
//         });
//         await manager.save(nuevaVenta);

//         // 👇 Guardamos los datos reales en la factura
//         const nuevaFactura = manager.create(Factura, {
//             clave_numerica,
//             consecutivo,
//             xml_enviado: xmlFirmadoBase64,
//             xml_respuesta: '<Respuesta Simulada>', // Placeholder
//             venta: nuevaVenta,
//         });
//         await manager.save(nuevaFactura);

//         await manager.update(Vehicle, cotizacion.vehiculo.id, { estado: 'Vendido' });
        
//         return nuevaVenta;
//     });
    
//     return transactionResult;
//   }
// }