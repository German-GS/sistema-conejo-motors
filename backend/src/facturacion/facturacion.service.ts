// backend/src/facturacion/facturacion.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Venta } from '../ventas/venta.entity';
import { Factura } from './factura.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class FacturacionService {
  constructor(
    @InjectRepository(Cotizacion)
    private cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(Factura)
    private facturasRepository: Repository<Factura>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
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

    // =================================================================
    // AQUÍ IRÍA LA LÓGICA DE CONEXIÓN CON LA API DE HACIENDA
    // 1. Generar el XML de la factura con los datos de la cotización.
    // 2. Firmar el XML con la llave criptográfica.
    // 3. Enviar a la API de Hacienda y recibir la clave numérica y el consecutivo.
    // Por ahora, simularemos una respuesta exitosa.
    // =================================================================
    const haciendaResponse = {
        clave_numerica: `506${new Date().toISOString().slice(2,10).replace(/-/g,"")}${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        consecutivo: `0010000101${Math.random().toString().slice(2,12)}`,
        xml_enviado: '<xml>...</xml>',
        xml_respuesta: '<xml>...</xml>',
    };
    
    // Si Hacienda responde OK, procedemos a crear la venta y la factura en la BD
    const transactionResult = await this.ventasRepository.manager.transaction(async (manager) => {
        // 1. Crear la Venta (¡AHORA SÍ!)
        const nuevaVenta = manager.create(Venta, {
            cotizacion: cotizacion,
            vendedor: cotizacion.vendedor,
            monto_final: cotizacion.precio_final,
            metodo_pago: 'Facturado', // O el método real
        });
        await manager.save(nuevaVenta);

        // 2. Crear la Factura
        const nuevaFactura = manager.create(Factura, {
            ...haciendaResponse,
            venta: nuevaVenta,
        });
        await manager.save(nuevaFactura);

        // 3. Marcar el vehículo como 'Vendido'
        await manager.update(Vehicle, cotizacion.vehiculo.id, { estado: 'Vendido' });

        // 4. Marcar la cotización como 'Facturada' o 'Completada' (opcional)
        // await manager.update(Cotizacion, cotizacion.id, { estado: 'Completada' });

        return nuevaVenta;
    });
    
    return transactionResult;
  }
}