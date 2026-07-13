// backend/src/facturacion/xml-generator.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { create } from 'xmlbuilder2';
import { NumeracionService } from './numeracion.service';
import { CABYS_DEFAULTS } from '../cabys/cabys.service';

// Namespace oficial de la Factura Electrónica v4.4 (TRIBU-CR). Confirmar el URI exacto
// contra el Anexo de estructuras v4.4 vigente de Hacienda antes de producción.
const NS_FE_V44 = 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica';

// CABYS por defecto para la venta de vehículos (concesionaria EV). Overridable por línea.
const CABYS_VEHICULO_DEFAULT = CABYS_DEFAULTS.VEHICULO_ELECTRICO; // 4911315000000

export interface OpcionesFactura {
  /** Vehículo eléctrico exonerado de IVA (Ley 9518). */
  exonerado?: boolean;
  numeroExoneracion?: string;
  condicionVenta?: string; // 01 contado, 02 crédito...
  medioPago?: string; // 01 efectivo, 02 tarjeta, 04 transferencia...
  /** CABYS (13 díg.) del vehículo; por defecto vehículo eléctrico. */
  cabysVehiculo?: string;
  /** Marca el XML como borrador no válido fiscalmente (modo interino). */
  borrador?: boolean;
}

export interface ResultadoXml {
  xml: string;
  clave: string;
  consecutivo: string;
  codigoSeguridad: string;
  situacion: string;
  provisional: boolean;
}

@Injectable()
export class XmlGeneratorService {
  constructor(
    private configService: ConfigService,
    private readonly numeracion: NumeracionService,
  ) {}

  /**
   * Genera el XML v4.4 del comprobante para una cotización, con clave/consecutivo REALES
   * en estructura. En modo interino (borrador) la numeración es PROVISIONAL: no consume
   * el secuencial oficial (para no dejar huecos al entrar a producción).
   */
  async generar(cotizacion: Cotizacion, opts: OpcionesFactura = {}): Promise<ResultadoXml> {
    const ahora = new Date();
    const cedulaEmisor = this.configService.get<string>('EMISOR_CEDULA') ?? '0';
    const provisional = opts.borrador !== false; // por defecto, borrador

    // Numeración: provisional (no consume secuencia) en interino.
    const secuencialProvisional = Number(String(Date.now()).slice(-10));
    const consecutivo = this.numeracion.armarConsecutivo({ tipo: '01', secuencial: secuencialProvisional });
    const { clave, codigoSeguridad, situacion } = this.numeracion.armarClave({
      cedulaEmisor,
      consecutivo,
      fecha: ahora,
    });

    const base = Number(cotizacion.precio_final) || 0;
    const tarifa = opts.exonerado ? 0 : 13;
    const impuestoMonto = +(base * (tarifa / 100)).toFixed(2);
    const totalLinea = +(base + impuestoMonto).toFixed(2);

    const emisor: any = {
      // Nombre = razón social legal; NombreComercial = nombre de fantasía (opcional en v4.4).
      Nombre: this.configService.get('EMISOR_NOMBRE'),
      Identificacion: {
        Tipo: this.configService.get('EMISOR_TIPO_IDENTIFICACION'),
        Numero: this.configService.get('EMISOR_CEDULA'),
      },
      NombreComercial: this.configService.get('EMISOR_NOMBRE_COMERCIAL') ?? undefined,
      // v4.4: actividad económica del emisor
      CodigoActividadEmisor: this.configService.get('EMISOR_ACTIVIDAD') ?? '451001',
      Ubicacion: {
        Provincia: this.configService.get('EMISOR_PROVINCIA'),
        Canton: this.configService.get('EMISOR_CANTON'),
        Distrito: this.configService.get('EMISOR_DISTRITO'),
        OtrasSenas: this.configService.get('EMISOR_DIRECCION'),
      },
      Telefono: { CodigoPais: '506', NumTelefono: this.configService.get('EMISOR_TELEFONO') },
      CorreoElectronico: this.configService.get('EMISOR_EMAIL'),
    };

    const receptor = {
      Nombre: cotizacion.cliente?.nombre_completo,
      Identificacion: { Tipo: '01', Numero: cotizacion.cliente?.cedula },
      CorreoElectronico: cotizacion.cliente?.email,
    };

    const impuesto: any = {
      Codigo: '01', // IVA
      CodigoTarifaIVA: opts.exonerado ? '01' : '08', // 01 exento (0%) / 08 tarifa general 13%
      Tarifa: tarifa.toFixed(2),
      Monto: impuestoMonto.toFixed(2),
    };
    if (opts.exonerado) {
      impuesto.Exoneracion = {
        TipoDocumentoEX: '99',
        NumeroDocumento: opts.numeroExoneracion ?? 'N/A',
        NombreInstitucion: 'Ministerio de Hacienda',
        FechaEmisionEX: ahora.toISOString().slice(0, 10),
        TarifaExonerada: '13.00',
        MontoExoneracion: (+(base * 0.13)).toFixed(2),
      };
    }

    const lineaDetalle = {
      NumeroLinea: 1,
      // CABYS obligatorio en v4.4
      CodigoCABYS: opts.cabysVehiculo ?? CABYS_VEHICULO_DEFAULT,
      CodigoComercial: { Tipo: '04', Codigo: cotizacion.vehiculo?.vin }, // VIN
      Cantidad: 1,
      UnidadMedida: 'Unid',
      Detalle: `${cotizacion.vehiculo?.marca ?? ''} ${cotizacion.vehiculo?.modelo ?? ''} ${cotizacion.vehiculo?.año ?? ''}`.trim(),
      PrecioUnitario: base.toFixed(2),
      MontoTotal: base.toFixed(2),
      SubTotal: base.toFixed(2),
      BaseImponible: base.toFixed(2),
      Impuesto: impuesto,
      ImpuestoNeto: impuestoMonto.toFixed(2),
      MontoTotalLinea: totalLinea.toFixed(2),
    };

    const resumen = {
      CodigoTipoMoneda: { CodigoMoneda: 'CRC', TipoCambio: '1.00000' },
      TotalServGravados: '0.00',
      TotalServExentos: '0.00',
      TotalMercanciasGravadas: opts.exonerado ? '0.00' : base.toFixed(2),
      TotalMercanciasExentas: opts.exonerado ? base.toFixed(2) : '0.00',
      TotalGravado: opts.exonerado ? '0.00' : base.toFixed(2),
      TotalExento: opts.exonerado ? base.toFixed(2) : '0.00',
      TotalVenta: base.toFixed(2),
      TotalVentaNeta: base.toFixed(2),
      TotalImpuesto: impuestoMonto.toFixed(2),
      TotalComprobante: totalLinea.toFixed(2),
    };

    const payload = {
      FacturaElectronica: {
        '@xmlns': NS_FE_V44,
        Clave: clave,
        ProveedorSistemas: this.configService.get('EMISOR_CEDULA'),
        CodigoActividadEmisor: emisor.CodigoActividadEmisor,
        NumeroConsecutivo: consecutivo,
        FechaEmision: ahora.toISOString(),
        Emisor: emisor,
        Receptor: receptor,
        CondicionVenta: opts.condicionVenta ?? '01',
        DetalleServicio: { LineaDetalle: [lineaDetalle] },
        ResumenFactura: {
          ...resumen,
          MedioPago: { TipoMedioPago: opts.medioPago ?? '01' },
        },
      },
    };

    const doc = create(payload);
    let xml = doc.end({ prettyPrint: true });

    if (provisional) {
      // Marcado legal: este comprobante NO es válido fiscalmente.
      xml = xml.replace(
        '<FacturaElectronica',
        '<!-- BORRADOR — no válido para efectos tributarios. Numeración provisional; sin firma XAdES ni transmisión a Hacienda. -->\n<FacturaElectronica',
      );
    }

    return { xml, clave, consecutivo, codigoSeguridad, situacion, provisional };
  }

  // ── Compatibilidad con el llamador anterior ────────────────────────────────
  /** @deprecated Usar generar(). Mantiene la firma antigua para no romper llamadores. */
  async generateXml(cotizacion: Cotizacion): Promise<string> {
    const { xml } = await this.generar(cotizacion, { borrador: true });
    return xml;
  }
}
