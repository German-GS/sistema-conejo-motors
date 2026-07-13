import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cotizacion } from '../cotizaciones/cotizacion.entity';
import { Venta } from '../ventas/venta.entity';
import { Factura } from './factura.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleEstadoHistorial } from '../vehicles/vehicle-estado-historial.entity';
import { Lead } from '../leads/lead.entity';
import { LeadActividad } from '../leads/lead-actividad.entity';
import { CuentaCobrar } from '../cxc/cuenta-cobrar.entity';
import { CryptoService } from './crypto.service';
import { XmlGeneratorService } from './xml-generator.service';
import { ContabilidadService } from '../contabilidad/contabilidad.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SugefService } from '../sugef/sugef.service';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const GCS_BUCKET_FACT = process.env.GCS_BUCKET ?? 'conejo-motors-media';
const bucketFact = new Storage().bucket(GCS_BUCKET_FACT);
const MIME_COMPROBANTE_FACT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_BYTES_FACT = 15 * 1024 * 1024;

export interface DatosFacturacion {
  factura_nombre: string;
  factura_tipo_cedula: 'fisica' | 'juridica' | 'extranjero';
  factura_cedula: string;
  factura_email: string;
  factura_telefono?: string;
  metodo_pago: string;
  factura_notas?: string;
  /** Cumplimiento SUGEF: confirmación de depósito/financiamiento listo */
  deposito_confirmado?: boolean;
  /** Facturar aunque falten campos SUGEF (queda registrado) */
  sugef_omitir?: boolean;
  /** Exoneración de IVA (vehículo eléctrico, Ley 9518) */
  exonerado?: boolean;
  numero_exoneracion?: string;
  /** Fecha histórica de la venta (YYYY-MM-DD) para reconstrucción; por defecto = hoy */
  fecha?: string;
}

@Injectable()
export class FacturacionService {
  constructor(
    @InjectRepository(Cotizacion)
    private cotizacionesRepo: Repository<Cotizacion>,
    @InjectRepository(Venta)
    private ventasRepo: Repository<Venta>,
    @InjectRepository(Factura)
    private facturasRepo: Repository<Factura>,
    @InjectRepository(Vehicle)
    private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Lead)
    private leadsRepo: Repository<Lead>,
    @InjectRepository(LeadActividad)
    private actividadesRepo: Repository<LeadActividad>,
    @InjectRepository(CuentaCobrar)
    private cxcRepo: Repository<CuentaCobrar>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly xmlGenerator: XmlGeneratorService,
    private readonly cryptoService: CryptoService,
    private readonly contabilidad: ContabilidadService,
    private readonly notifications: NotificationsService,
    private readonly sugefService: SugefService,
  ) {}

  // ── Lista de cotizaciones listas para facturar ────────────────────────────

  /** Cotizaciones facturables: solo las ya formalizadas con el cliente (Enviada/Aceptada).
   *  Los borradores no se facturan hasta enviarse. */
  async getPendingInvoices(): Promise<Cotizacion[]> {
    return this.cotizacionesRepo.find({
      where: { estado: In(['Aceptada', 'Enviada']) },
      relations: ['cliente', 'vehiculo', 'vendedor', 'lead'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  /** Buscar cotizaciones activas por cédula, nombre del cliente o leadId (lead:123) */
  async buscarCotizacionesCliente(q: string): Promise<Cotizacion[]> {
    const qb = this.cotizacionesRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.cliente', 'cliente')
      .leftJoinAndSelect('c.vehiculo', 'vehiculo')
      .leftJoinAndSelect('c.vendedor', 'vendedor')
      .leftJoinAndSelect('c.lead', 'lead')
      .where("c.estado NOT IN ('Facturada','Rechazada')")
      .orderBy('c.fecha_creacion', 'DESC');

    // Soporte para búsqueda por lead: "lead:123"
    if (q.toLowerCase().startsWith('lead:')) {
      const leadId = parseInt(q.split(':')[1], 10);
      if (!isNaN(leadId)) {
        qb.andWhere('lead.id = :leadId', { leadId });
        return qb.getMany();
      }
    }

    qb.andWhere(
      '(LOWER(cliente.nombre_completo) LIKE :s OR cliente.cedula LIKE :s OR LOWER(cliente.email) LIKE :s)',
      { s: `%${q.toLowerCase()}%` },
    );
    return qb.getMany();
  }

  /** Detalle completo de una cotización para el formulario de facturación */
  async getDetalleCotizacion(id: number): Promise<Cotizacion> {
    const c = await this.cotizacionesRepo.findOne({
      where: { id },
      relations: ['cliente', 'vehiculo', 'vendedor', 'lead'],
    });
    if (!c) throw new NotFoundException(`Cotización #${id} no encontrada.`);
    return c;
  }

  /** Historial de ventas completadas */
  async getVentas(): Promise<Venta[]> {
    return this.ventasRepo.find({
      relations: ['cotizacion', 'cotizacion.cliente', 'cotizacion.vehiculo', 'vendedor'],
      order: { fecha_venta: 'DESC' },
      take: 100,
    });
  }

  // ── Procesar la venta/factura ─────────────────────────────────────────────

  async facturar(
    cotizacionId: number,
    datos: DatosFacturacion,
    adminUser: any,
  ): Promise<Venta> {
    const cotizacion = await this.cotizacionesRepo.findOne({
      where: { id: cotizacionId },
      // 'lead' es necesario para cerrar el lead al facturar (ver más abajo)
      relations: ['cliente', 'vehiculo', 'vendedor', 'lead'],
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización #${cotizacionId} no encontrada.`);
    }
    if (cotizacion.estado === 'Facturada') {
      throw new BadRequestException('Esta cotización ya fue facturada.');
    }

    // ── CUMPLIMIENTO SUGEF / depósito (validado en backend) ────────────────────
    // Confirmación de depósito/financiamiento listo para firmar con el banco
    if (!datos.deposito_confirmado) {
      throw new BadRequestException(
        'Debe confirmar que el depósito/financiamiento está listo (validado con el banco) antes de facturar.',
      );
    }
    // KYC completo si el lead está bajo debida diligencia
    if (cotizacion.lead?.id) {
      const kycCompleto = await this.sugefService.kycCompleto(cotizacion.lead.id);
      if (!kycCompleto && !datos.sugef_omitir) {
        const kyc = await this.sugefService.getKyc(cotizacion.lead.id);
        throw new BadRequestException({
          message: 'Faltan campos de cumplimiento SUGEF para facturar.',
          code: 'SUGEF_INCOMPLETO',
          faltantes: this.sugefService.faltantesKyc(kyc),
        });
      }
      if (!kycCompleto && datos.sugef_omitir) {
        // Se factura de todas formas → queda registrado en el historial del lead
        await this.actividadesRepo.save(this.actividadesRepo.create({
          lead: { id: cotizacion.lead.id } as any,
          tipo: 'estado_cambio',
          descripcion: `⚠️ Facturado por ${adminUser?.nombre_completo ?? 'admin'} con expediente SUGEF INCOMPLETO (incumplimiento registrado).`,
          usuario: adminUser,
        }));
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FACTURA ELECTRÓNICA — MODO SIMULADO (Hacienda Costa Rica v4.4)
    //
    // ⚠️ PENDIENTE: integración real con el Ministerio de Hacienda.
    // Hoy el XML se "firma" y se da por aceptado de forma SIMULADA porque aún
    // NO tenemos las LLAVES CRIPTOGRÁFICAS (llave criptográfica .p12 + PIN y el
    // usuario/contraseña del API de Hacienda — ATV / IDP token).
    //
    // Cuando lleguen las llaves, aquí va el flujo real:
    //   1. cryptoService.signXml(): firmar el XML con la llave .p12 real (XAdES-EPES).
    //   2. Obtener token OAuth del IDP de Hacienda (idp.comprobanteselectronicos.go.cr).
    //   3. POST del comprobante firmado al API de recepción (api.comprobanteselectronicos.go.cr/recepcion).
    //   4. Consultar el estado real y guardar la respuesta (Aceptado/Rechazado) en factura.xml_respuesta.
    //   5. Enviar el XML + PDF al correo del cliente.
    //
    // Mientras tanto, el comprobante generado NO es válido fiscalmente.
    // ─────────────────────────────────────────────────────────────────────────
    const xmlSinFirma = await this.xmlGenerator.generateXml(cotizacion);
    const xmlFirmadoBase64 = await this.cryptoService.signXml(xmlSinFirma);
    const payload = await this.xmlGenerator.buildPayload(cotizacion);
    const { Clave: clave_numerica, NumeroConsecutivo: consecutivo } = payload.FacturaElectronica;

    let facturaCreada: Factura | undefined;
    const venta = await this.ventasRepo.manager.transaction(async (manager) => {
      const base = Number(cotizacion.precio_final) || 0;
      // Exoneración EV (Ley 9518): sin IVA. Si no, IVA 13%.
      const ivaMonto    = datos.exonerado ? 0 : (Number(cotizacion.iva_monto)    || +(base * 0.13).toFixed(2));
      const totalConIva = datos.exonerado ? base : (Number(cotizacion.total_con_iva) || +(base * 1.13).toFixed(2));

      const nuevaVenta = manager.create(Venta, {
        cotizacion,
        vendedor:            cotizacion.vendedor ?? adminUser,
        fecha_venta:         datos.fecha ? new Date(`${datos.fecha}T12:00:00`) : new Date(),
        monto_final:         cotizacion.precio_final,  // base imponible (sin IVA)
        iva_monto:           ivaMonto,
        total_con_iva:       totalConIva,
        iva_tarifa:          datos.exonerado ? 'Exento' : 'T13',
        iva_condicion:       datos.exonerado ? 'Exonerado' : 'Gravado',
        numero_exoneracion:  datos.exonerado ? (datos.numero_exoneracion ?? null) : null,
        metodo_pago:         datos.metodo_pago,
        factura_nombre:      datos.factura_nombre,
        factura_tipo_cedula: datos.factura_tipo_cedula,
        factura_cedula:      datos.factura_cedula,
        factura_email:       datos.factura_email,
        factura_telefono:    datos.factura_telefono,
        factura_notas:       datos.factura_notas,
        estado:              'Completada',
      });
      await manager.save(nuevaVenta);

      const nuevaFactura = manager.create(Factura, {
        clave_numerica,
        consecutivo,
        xml_enviado:   xmlFirmadoBase64,
        xml_respuesta: '<RespuestaSimulada>Aceptado</RespuestaSimulada>',
        estado:        'Procesando',
        venta:         nuevaVenta,
      });
      await manager.save(nuevaFactura);
      facturaCreada = nuevaFactura;

      // Marcar vehículo como Vendido
      const estadoVehAnterior = cotizacion.vehiculo.estado;
      await manager.update(Vehicle, cotizacion.vehiculo.id, { estado: 'Vendido' });
      await manager.save(VehicleEstadoHistorial, {
        vehiculo: { id: cotizacion.vehiculo.id } as any,
        estado_anterior: estadoVehAnterior,
        estado_nuevo: 'Vendido',
        tipo: 'estado',
        motivo: `Facturado (cotización #${cotizacion.id})`,
      });
      // Marcar cotización como Facturada
      await manager.update(Cotizacion, cotizacion.id, { estado: 'Facturada' });

      // Si la cotización tiene lead → marcar como Cerrado
      if (cotizacion.lead?.id) {
        await manager.update(Lead, cotizacion.lead.id, { estado: 'Cerrado' });
      }

      // Venta a crédito/financiamiento → crear la Cuenta por Cobrar
      // (los pagos al contado — Efectivo/Tarjeta/SINPE/Transferencia — no generan CxC)
      const esCredito = !['Efectivo', 'Tarjeta', 'SINPE', 'Transferencia'].includes(datos.metodo_pago);
      if (esCredito) {
        const vencimiento = new Date();
        vencimiento.setDate(vencimiento.getDate() + 30); // 30 días por defecto
        await manager.save(CuentaCobrar, {
          numero: `CXC-V${nuevaVenta.id}`,
          cliente: cotizacion.cliente ?? undefined,
          concepto: `Venta a crédito — ${cotizacion.vehiculo?.marca ?? ''} ${cotizacion.vehiculo?.modelo ?? ''} (${cotizacion.vehiculo?.vin ?? '—'})`,
          tipo: 'Venta Vehiculo',
          monto_original: totalConIva,
          monto_pagado: 0,
          saldo_pendiente: totalConIva,
          fecha_emision: new Date().toISOString().split('T')[0],
          fecha_vencimiento: vencimiento.toISOString().split('T')[0],
          estado: 'Pendiente',
          responsable: cotizacion.vendedor ?? adminUser,
        });
      }

      return nuevaVenta;
    });

    // ── Retención SUGEF (5 años) — evento de venta confirmada ──────────────────
    if (cotizacion.lead?.id) {
      try {
        await this.sugefService.registrarRetencion(cotizacion.lead.id, facturaCreada);
      } catch (e) {
        console.warn('[Facturacion] No se pudo registrar la retención SUGEF:', (e as Error).message);
      }
    }

    // ── Asiento contable automático ───────────────────────────────────────────
    // Solo si el plan de cuentas ya fue inicializado
    try {
      await this._registrarAsientoVenta(venta, cotizacion, datos, adminUser);
    } catch (e) {
      // No bloquear la venta si la contabilidad falla (ej: cuentas no inicializadas)
      console.warn('[Facturacion] No se pudo crear asiento contable:', (e as Error).message);
    }

    // Recargar la venta con relaciones para devolverla al frontend
    return this.ventasRepo.findOne({
      where: { id: venta.id },
      relations: ['cotizacion', 'cotizacion.cliente', 'cotizacion.vehiculo', 'vendedor'],
    }) as Promise<Venta>;
  }

  async subirComprobanteVenta(ventaId: number, file: Express.Multer.File): Promise<Venta> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    if (file.size > MAX_BYTES_FACT) throw new BadRequestException('El archivo supera el límite de 15 MB.');
    if (file.mimetype && !MIME_COMPROBANTE_FACT.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo no permitido: ${file.mimetype}. Use PDF o imagen.`);
    }
    const venta = await this.ventasRepo.findOneBy({ id: ventaId });
    if (!venta) throw new NotFoundException(`Venta #${ventaId} no encontrada.`);
    if (venta.comprobante_gcs_path) await bucketFact.file(venta.comprobante_gcs_path).delete().catch(() => {});
    const ext = (file.originalname.split('.').pop() ?? 'bin').toLowerCase();
    const gcsPath = `ventas-comprobantes/${ventaId}/${uuidv4()}.${ext}`;
    await bucketFact.file(gcsPath).save(file.buffer, { metadata: { contentType: file.mimetype }, resumable: false });
    venta.comprobante_gcs_path = gcsPath;
    venta.comprobante_nombre = file.originalname;
    venta.comprobante_mime = file.mimetype;
    return this.ventasRepo.save(venta);
  }

  async descargarComprobanteVenta(ventaId: number): Promise<{ venta: Venta; buffer: Buffer }> {
    const venta = await this.ventasRepo.findOneBy({ id: ventaId });
    if (!venta || !venta.comprobante_gcs_path) throw new NotFoundException('La venta no tiene comprobante.');
    const [buffer] = await bucketFact.file(venta.comprobante_gcs_path).download();
    return { venta, buffer };
  }

  /** Crea el asiento contable de partida doble al registrar una venta de vehículo */
  private async _registrarAsientoVenta(
    venta: Venta,
    cotizacion: Cotizacion,
    datos: DatosFacturacion,
    adminUser: any,
  ): Promise<void> {
    // Idempotencia: no duplicar el asiento si la venta ya fue contabilizada (reintento).
    if (await this.contabilidad.existeAsientoPorReferencia('Venta', venta.id)) return;

    const cuentas = await this.contabilidad['cuentasRepo'].find();
    if (!cuentas.length) return; // Plan de cuentas no inicializado

    const porCodigo = (codigo: string) => cuentas.find((c: any) => c.codigo === codigo);

    // Cuenta de cobro según método de pago
    const cuentaCobro =
      datos.metodo_pago === 'Efectivo'
        ? porCodigo('1100')  // Caja
        : datos.metodo_pago === 'Tarjeta' || datos.metodo_pago === 'SINPE' || datos.metodo_pago === 'Transferencia'
        ? porCodigo('1110')  // Banco Cuenta Corriente
        : porCodigo('1200'); // Cuentas por Cobrar (crédito/financiamiento)

    const cuentaIngreso   = porCodigo('4100'); // Ventas de Vehículos
    const cuentaCostoVtas = porCodigo('5100'); // Costo de Ventas — Vehículos
    const cuentaInventario = porCodigo('1300'); // Inventario Vehículos

    if (!cuentaCobro || !cuentaIngreso) return;

    const baseImponible = Number(cotizacion.precio_final) || 0;
    const exonerada     = ['Exonerado', 'Exento'].includes(venta.iva_condicion);
    const ivaMonto      = exonerada ? 0 : (Number(venta.iva_monto) || +(baseImponible * 0.13).toFixed(2));
    const costo = Number(cotizacion.vehiculo?.precio_costo) || 0;
    const cuentaIva = porCodigo('2200'); // IVA por Pagar
    // El cobro se deriva de base + IVA efectivamente reconocidos → cuadre exacto al céntimo.
    const ivaReconocido = (ivaMonto > 0 && cuentaIva) ? ivaMonto : 0;
    const totalCobrado  = Math.round((baseImponible + ivaReconocido) * 100) / 100;

    const lineas: { cuentaId: number; debe: number; haber: number; descripcion?: string }[] = [
      // Cobro total (incluye IVA)
      { cuentaId: cuentaCobro.id,   debe: totalCobrado,  haber: 0,
        descripcion: `Cobro venta — ${cotizacion.vehiculo?.marca ?? ''} ${cotizacion.vehiculo?.modelo ?? ''} (inc. IVA)` },
      // Ingreso neto (base imponible)
      { cuentaId: cuentaIngreso.id, debe: 0, haber: baseImponible,
        descripcion: `Venta vehículo VIN ${cotizacion.vehiculo?.vin ?? '—'}` },
    ];

    // IVA → cuenta de pasivo 2200
    if (ivaMonto > 0 && cuentaIva) {
      lineas.push({
        cuentaId: cuentaIva.id, debe: 0, haber: ivaMonto,
        descripcion: `IVA 13% — venta vehículo`,
      });
    }

    // Si hay costo de inventario registrado → asiento del costo
    if (costo > 0 && cuentaCostoVtas && cuentaInventario) {
      lineas.push(
        { cuentaId: cuentaCostoVtas.id,  debe: costo, haber: 0,
          descripcion: `Costo de venta — ${cotizacion.vehiculo?.marca ?? ''} ${cotizacion.vehiculo?.modelo ?? ''}` },
        { cuentaId: cuentaInventario.id, debe: 0, haber: costo,
          descripcion: `Salida de inventario — placa ${cotizacion.vehiculo?.vin ?? '—'}` },
      );
    }

    const hoy = datos.fecha ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

    await this.contabilidad.crearAsiento(adminUser, {
      fecha: hoy,
      descripcion: `Venta vehículo — ${cotizacion.vehiculo?.marca ?? ''} ${cotizacion.vehiculo?.modelo ?? ''} (${cotizacion.vehiculo?.vin ?? '—'}) a ${datos.factura_nombre}`,
      tipo: 'Venta_Vehiculo',
      referencia_id: venta.id,
      referencia_tipo: 'Venta',
      lineas,
    });
  }

  // ── Solicitud de facturación desde vendedor ───────────────────────────────

  /**
   * El vendedor envía una solicitud de facturación.
   * Se notifica a todos los Admins y Contadores con un link directo a billing.
   * No requiere privilegios de Admin.
   */
  async solicitarFacturacion(
    vendedor: any,
    body: { leadId?: number; cotizacionId?: number; nota?: string },
  ): Promise<{ ok: true; mensaje: string }> {
    const nombreVendedor: string = vendedor.nombre_completo ?? vendedor.email ?? 'Un vendedor';

    // Construir descripción del item
    let detalle = '';
    let linkBilling = '/admin/billing';

    if (body.cotizacionId) {
      const cot = await this.cotizacionesRepo.findOne({
        where: { id: body.cotizacionId },
        relations: ['cliente', 'vehiculo'],
      });
      if (cot) {
        detalle = `Cotización #${cot.id} — ${cot.vehiculo?.marca ?? ''} ${cot.vehiculo?.modelo ?? ''} — ${cot.cliente?.nombre_completo ?? ''}`;
        linkBilling = `/admin/billing?cotizacionId=${cot.id}`;
      } else {
        detalle = `Cotización #${body.cotizacionId}`;
        linkBilling = `/admin/billing?cotizacionId=${body.cotizacionId}`;
      }
    } else if (body.leadId) {
      linkBilling = `/admin/billing?leadId=${body.leadId}`;
      const lead = await this.leadsRepo.findOne({ where: { id: body.leadId } });
      detalle = lead ? `Lead de ${lead.nombre_cliente}` : `Lead #${body.leadId}`;
    }

    const notaExtra = body.nota ? ` · "${body.nota}"` : '';
    const mensaje = `💼 ${nombreVendedor} envió ${detalle} para facturación${notaExtra}`;

    await this.notifications.createForAdminsAndContadores(mensaje, linkBilling);

    return { ok: true, mensaje: '✅ Solicitud enviada al equipo de contabilidad.' };
  }

  // Mantener compatibilidad con endpoint antiguo
  async createInvoiceForSale(cotizacionId: number, adminUser: any): Promise<Venta> {
    const cotizacion = await this.cotizacionesRepo.findOne({
      where: { id: cotizacionId },
      relations: ['cliente', 'vehiculo', 'vendedor'],
    });
    if (!cotizacion) throw new NotFoundException(`Cotización #${cotizacionId} no encontrada.`);

    return this.facturar(cotizacionId, {
      factura_nombre:      cotizacion.cliente?.nombre_completo ?? 'Cliente',
      factura_tipo_cedula: 'fisica',
      factura_cedula:      cotizacion.cliente?.cedula ?? '',
      factura_email:       cotizacion.cliente?.email ?? '',
      metodo_pago:         'Efectivo',
      deposito_confirmado: true,
      sugef_omitir:        true,
    }, adminUser);
  }
}
