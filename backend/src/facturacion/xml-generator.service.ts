// backend/src/facturacion/xml-generator.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { create } from 'xmlbuilder2';
import { randomInt } from 'crypto';

@Injectable()
export class XmlGeneratorService {
  constructor(private configService: ConfigService) {}

  /**
   * Construye el objeto de la Factura Electrónica v4.4.
   * @param cotizacion La cotización que se va a facturar.
   * @returns Un objeto listo para ser convertido a XML.
   */
  async buildPayload(cotizacion: Cotizacion): Promise<any> {
    const ahora = new Date();
    // 1. Generar Clave y Consecutivo
    const { clave, consecutivo } = this.generarClaveYConsecutivo();
    
    // 2. Datos del Emisor (desde variables de entorno)
    const emisor = {
      Nombre: this.configService.get('EMISOR_NOMBRE'),
      Identificacion: {
        Tipo: this.configService.get('EMISOR_TIPO_IDENTIFICACION'),
        NumIdentificacion: this.configService.get('EMISOR_CEDULA'),
      },
      Ubicacion: {
          Provincia: this.configService.get('EMISOR_PROVINCIA'),
          Canton: this.configService.get('EMISOR_CANTON'),
          Distrito: this.configService.get('EMISOR_DISTRITO'),
          Barrio: this.configService.get('EMISOR_BARRIO'),
          OtrasSenas: this.configService.get('EMISOR_DIRECCION'),
      },
      Telefono: {
          CodigoPais: '506',
          NumTelefono: this.configService.get('EMISOR_TELEFONO'),
      },
      CorreoElectronico: this.configService.get('EMISOR_EMAIL'),
    };


    // 3. Datos del Receptor (desde la cotización)
    const receptor = {
      Nombre: cotizacion.cliente.nombre_completo,
      Identificacion: {
        Tipo: '01', // Cédula Física
        NumIdentificacion: cotizacion.cliente.cedula,
      },
      // ... otros datos del receptor
    };

    // 4. Línea de Detalle (el vehículo)
    const lineaDetalle = {
        NumeroLinea: 1,
        // 👇 El VIN es CRÍTICO para vehículos 👇
        CodigoComercial: { Tipo: '04', Codigo: cotizacion.vehiculo.vin },
        Cantidad: 1,
        UnidadMedida: 'Unid',
        Detalle: `${cotizacion.vehiculo.marca} ${cotizacion.vehiculo.modelo} ${cotizacion.vehiculo.año}`,
        PrecioUnitario: cotizacion.precio_final,
        MontoTotal: cotizacion.precio_final,
        Impuesto: {
            // IVA del 13% siempre se calcula, la exoneración es sobre otros impuestos.
            Monto: cotizacion.precio_final * 0.13,
            Tarifa: 13.0,
        },
        MontoTotalLinea: cotizacion.precio_final * 1.13,
    };

    // 5. Ensamblar el payload completo
    const payload = {
      FacturaElectronica: {
        '@xmlns': 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica',
        Clave: clave,
        NumeroConsecutivo: consecutivo,
        FechaEmision: ahora.toISOString(),
        Emisor: emisor,
        Receptor: receptor,
        CondicionVenta: '01', // Contado
        MedioPago: '01', // Efectivo (o el que corresponda)
        DetalleServicio: {
          LineaDetalle: [lineaDetalle],
        },
        ResumenFactura: {
          TotalVenta: cotizacion.precio_final,
          TotalImpuesto: lineaDetalle.Impuesto.Monto,
          TotalComprobante: lineaDetalle.MontoTotalLinea,
        },
      },
    };

    return payload;
  }
  
  /**
   * Genera el XML a partir del payload.
   */
  async generateXml(cotizacion: Cotizacion): Promise<string> {
      const payload = await this.buildPayload(cotizacion);
      const doc = create(payload);
      return doc.end({ prettyPrint: true });
  }

  private generarClaveYConsecutivo(): { clave: string, consecutivo: string } {
    // Lógica para generar la clave de 50 dígitos y el consecutivo de 20
    // Esto es una simulación. Debes implementarla según la estructura oficial.
    const consecutivo = `0010000101${randomInt(1000000000).toString().padStart(10, '0')}`;
    const clave = `506...${consecutivo}...`; // Simulación
    return { clave, consecutivo };
  }
}