import { Injectable } from '@nestjs/common';
import { EmisorConfig } from './emisor-config.entity';
import { NumeracionService } from './numeracion.service';
import { CABYS_DEFAULTS } from '../cabys/cabys.service';

export interface LineaHtml {
  cabys?: string;
  detalle: string;
  cantidad: number;
  precioUnitario: number;
  tarifaIva: number; // fracción (0.13, 0)
  /** Precio unitario en USD (valor fijo del vehículo); habilita la vista en dólares. */
  precioUnitarioUsd?: number;
}

export interface DocumentoHtml {
  tipo: 'Factura Electrónica' | 'Tiquete Electrónico' | 'Proforma';
  emisor: EmisorConfig;
  clave?: string;
  consecutivo?: string;
  receptorNombre: string;
  receptorCedula?: string;
  condicionVenta: string;
  medioPago: string;
  lineas: LineaHtml[];
  fecha: Date;
  borrador: boolean;
  /** Solo proforma: fecha de validez. */
  validaHasta?: string;
  /** Tipo de cambio del dólar; si >0, la proforma muestra los totales también en USD. */
  tipoCambio?: number;
}

const CRC = (v: number) => '₡' + (Number(v) || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: any) => String(s ?? '').replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m] as string));

/** Genera la representación gráfica (HTML imprimible) de un comprobante. */
@Injectable()
export class FacturaHtmlService {
  constructor(private readonly numeracion: NumeracionService) {}

  /** Documento de ejemplo (datos ficticios) para previsualizar el diseño. */
  demo(emisor: EmisorConfig, tipo: DocumentoHtml['tipo'] = 'Factura Electrónica'): DocumentoHtml {
    const fecha = new Date();
    const consecutivo = this.numeracion.armarConsecutivo({
      sucursal: emisor.sucursal, terminal: emisor.terminal,
      tipo: tipo === 'Tiquete Electrónico' ? '04' : '01', secuencial: 1,
    });
    const { clave } = this.numeracion.armarClave({
      cedulaEmisor: emisor.cedula || '0', consecutivo, fecha, codigoSeguridad: '00000000',
    });
    return {
      tipo,
      emisor,
      clave,
      consecutivo,
      receptorNombre: tipo === 'Tiquete Electrónico' ? 'Contado' : 'Cliente de Ejemplo S.A.',
      receptorCedula: tipo === 'Tiquete Electrónico' ? undefined : '3-101-000000',
      condicionVenta: '01',
      medioPago: '02',
      fecha,
      borrador: true,
      lineas: [
        { cabys: '4911315000000', detalle: 'Vehículo eléctrico BYD Dolphin 2026 (VIN DEMO-XXXX)', cantidad: 1, precioUnitario: 18500000, tarifaIva: 0.13 },
        { cabys: '4912999009900', detalle: 'Cargador de pared / accesorio', cantidad: 1, precioUnitario: 350000, tarifaIva: 0.13 },
        { cabys: '8714100000200', detalle: 'Servicio de mantenimiento preventivo (10.000 km)', cantidad: 1, precioUnitario: 45000, tarifaIva: 0.13 },
      ],
    };
  }

  /** Proforma a partir de una cotización real (no es comprobante fiscal). */
  proformaCotizacion(emisor: EmisorConfig, cot: any, tipoCambio?: number): DocumentoHtml {
    const veh = cot.vehiculo;
    const detalle = veh
      ? `${veh.marca ?? ''} ${veh.modelo ?? ''} ${veh.año ?? ''}`.trim() + (veh.vin ? ` (VIN ${veh.vin})` : '')
      : (cot.vehiculo_descripcion ?? 'Vehículo');
    const tarifa = (Number(cot.iva_porcentaje) || 13) / 100;
    const precioCrc = Number(cot.precio_final) || 0;
    // Valor en dólares del vehículo (fijo). Si no está cargado, se estima con el TC vigente.
    const precioUsd = Number(veh?.precio_venta_usd) > 0
      ? Number(veh.precio_venta_usd)
      : (tipoCambio && tipoCambio > 0 ? +(precioCrc / tipoCambio).toFixed(2) : 0);
    const lineas: LineaHtml[] = [
      { cabys: CABYS_DEFAULTS.VEHICULO_ELECTRICO, detalle, cantidad: 1, precioUnitario: precioCrc, tarifaIva: tarifa, precioUnitarioUsd: precioUsd },
    ];
    return {
      tipo: 'Proforma',
      emisor,
      // Consecutivo propio de proforma (no es el consecutivo fiscal): PROF-<id>.
      consecutivo: `PROF-${String(cot.id).padStart(8, '0')}`,
      receptorNombre: cot.cliente?.nombre_completo ?? 'Cliente',
      receptorCedula: cot.cliente?.cedula ?? undefined,
      condicionVenta: '01',
      medioPago: '02',
      fecha: new Date(),
      borrador: false,
      validaHasta: cot.fecha_expiracion ? new Date(cot.fecha_expiracion).toLocaleDateString('es-CR') : undefined,
      tipoCambio: tipoCambio && tipoCambio > 0 ? tipoCambio : undefined,
      lineas,
    };
  }

  render(doc: DocumentoHtml): string {
    const esProforma = doc.tipo === 'Proforma';
    // La proforma refleja el valor FIJO en dólares del vehículo; el botón alterna la vista CRC↔USD.
    const hayUsd = esProforma && doc.lineas.some((l) => (l.precioUnitarioUsd ?? 0) > 0);
    const USD = (v: number) => '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Celda monetaria: si hay USD, incluye ambos valores y JS alterna cuál se ve.
    const money = (crcVal: number, usdVal: number) =>
      hayUsd
        ? `<span class="m m-crc" style="display:none">${CRC(crcVal)}</span><span class="m m-usd">${USD(usdVal)}</span>`
        : CRC(crcVal);

    const filas = doc.lineas.map((l, i) => {
      const sub = l.cantidad * l.precioUnitario;
      const iva = +(sub * l.tarifaIva).toFixed(2);
      const usdUnit = l.precioUnitarioUsd ?? 0;
      const usdTotal = +(usdUnit * l.cantidad * (1 + l.tarifaIva)).toFixed(2);
      return `<tr>
        <td class="c">${i + 1}</td>
        <td class="mono">${esc(l.cabys ?? '')}</td>
        <td>${esc(l.detalle)}</td>
        <td class="c">${l.cantidad}</td>
        <td class="r">${money(l.precioUnitario, usdUnit)}</td>
        <td class="c">${(l.tarifaIva * 100).toFixed(0)}%</td>
        <td class="r">${money(sub + iva, usdTotal)}</td>
      </tr>`;
    }).join('');

    const subtotal = doc.lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
    const totalIva = doc.lineas.reduce((s, l) => s + +(l.cantidad * l.precioUnitario * l.tarifaIva).toFixed(2), 0);
    const total = subtotal + totalIva;
    const subtotalUsd = doc.lineas.reduce((s, l) => s + (l.precioUnitarioUsd ?? 0) * l.cantidad, 0);
    const totalIvaUsd = doc.lineas.reduce((s, l) => s + +((l.precioUnitarioUsd ?? 0) * l.cantidad * l.tarifaIva).toFixed(2), 0);
    const totalUsd = +(subtotalUsd + totalIvaUsd).toFixed(2);
    const e = doc.emisor;
    const condiciones: Record<string, string> = { '01': 'Contado', '02': 'Crédito', '03': 'Consignación', '04': 'Apartado' };
    const medios: Record<string, string> = { '01': 'Efectivo', '02': 'Tarjeta', '03': 'Cheque', '04': 'Transferencia' };

    const marca = doc.borrador
      ? `<div class="watermark">BORRADOR — NO VÁLIDO FISCALMENTE</div>`
      : esProforma
      ? `<div class="watermark">PROFORMA</div>`
      : '';

    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.tipo)} — ${esc(e.nombre_comercial || e.razon_social)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; background: #f1f5f9; }
  .sheet { max-width: 820px; margin: 24px auto; background: #fff; padding: 36px 40px; border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); position: relative; overflow: hidden; }
  .watermark { position: absolute; top: 44%; left: 50%; transform: translate(-50%,-50%) rotate(-24deg); font-size: 2.4rem; font-weight: 900; color: rgba(220,38,38,0.13); border: 6px solid rgba(220,38,38,0.13); padding: 10px 30px; border-radius: 12px; white-space: nowrap; pointer-events: none; }
  .top { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #024f7d; padding-bottom: 16px; }
  .brand { font-size: 1.5rem; font-weight: 800; color: #024f7d; }
  .legal { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
  .doc-tag { text-align: right; }
  .doc-tag h2 { margin: 0; color: #0a2540; font-size: 1.1rem; }
  .doc-tag .badge { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 6px; padding: 2px 10px; font-size: 0.72rem; font-weight: 700; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 18px 0; font-size: 0.82rem; }
  .meta b { color: #475569; }
  .clave { font-family: ui-monospace, monospace; font-size: 0.72rem; color: #334155; word-break: break-all; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.8rem; }
  th { background: #024f7d; color: #fff; padding: 7px 8px; text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; }
  td.c, th.c { text-align: center; } td.r, th.r { text-align: right; } .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; color: #64748b; }
  .totals { margin-top: 14px; margin-left: auto; width: 300px; font-size: 0.88rem; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { border-top: 2px solid #0a2540; margin-top: 6px; padding-top: 8px; font-weight: 800; font-size: 1.05rem; color: #0a2540; }
  .cur-bar { margin-top: 14px; text-align: right; }
  .cur-bar button { background: #eef6fb; color: #024f7d; border: 1.5px solid #cfe3f0; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
  .cur-bar button:hover { background: #dceaf4; }
  .nota-form { margin-top: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; border-radius: 8px; padding: 9px 12px; font-size: 0.82rem; }
  .foot { margin-top: 26px; font-size: 0.72rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; line-height: 1.5; }
  .print-bar { max-width: 820px; margin: 12px auto; text-align: right; }
  .print-bar button { background: #024f7d; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 700; cursor: pointer; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; } .print-bar { display: none; } }
</style></head>
<body>
  <div class="print-bar"><button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button></div>
  <div class="sheet">
    ${marca}
    <div class="top">
      <div>
        <div class="brand">${esc(e.nombre_comercial || e.razon_social || 'Emisor')}</div>
        <div class="legal">${esc(e.razon_social)}${e.razon_social ? ' · ' : ''}Céd. ${esc(e.cedula)}</div>
        <div class="legal">${esc(e.otras_senas)}</div>
        <div class="legal">${esc(e.telefono)}${e.telefono ? ' · ' : ''}${esc(e.email)}</div>
      </div>
      <div class="doc-tag">
        <h2>${esc(doc.tipo)}</h2>
        ${doc.borrador ? '<span class="badge">BORRADOR</span>' : ''}
        <div class="legal" style="margin-top:6px">${esProforma ? 'N° Proforma' : 'Consecutivo'}<br><b>${esc(doc.consecutivo ?? '—')}</b></div>
        <div class="legal">Fecha: ${doc.fecha.toLocaleDateString('es-CR')}</div>
        ${doc.validaHasta ? `<div class="legal">Válida hasta: ${esc(doc.validaHasta)}</div>` : ''}
      </div>
    </div>

    <div class="meta">
      <div><b>Cliente:</b> ${esc(doc.receptorNombre)}</div>
      <div><b>Cédula:</b> ${esc(doc.receptorCedula ?? '—')}</div>
      <div><b>Condición de venta:</b> ${condiciones[doc.condicionVenta] ?? doc.condicionVenta}</div>
      <div><b>Medio de pago:</b> ${medios[doc.medioPago] ?? doc.medioPago}</div>
      <div><b>Actividad económica:</b> ${esc(e.actividad_economica || '—')}</div>
      <div><b>Moneda:</b> ${hayUsd ? 'USD (dólares) · convertible a ₡' : 'CRC (colones)'}</div>
    </div>

    ${doc.clave && !esProforma ? `<div class="clave"><b>Clave numérica:</b> ${esc(doc.clave)}</div>` : ''}

    <table>
      <thead><tr><th class="c">#</th><th>CABYS</th><th>Detalle</th><th class="c">Cant.</th><th class="r">Precio unit.</th><th class="c">IVA</th><th class="r">Total línea</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>

    ${hayUsd ? `<div class="cur-bar"><button type="button" id="curToggle" onclick="toggleMoneda()">💱 Ver en colones (₡)</button></div>` : ''}

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${money(subtotal, subtotalUsd)}</span></div>
      <div class="row"><span>IVA</span><span>${money(totalIva, totalIvaUsd)}</span></div>
      <div class="row grand"><span>TOTAL</span><span>${money(total, totalUsd)}</span></div>
    </div>

    ${esProforma ? `<div class="nota-form">✅ <b>Gastos de formalización incluidos</b> (traspaso e inscripción registral).</div>` : ''}

    <div class="foot">
      ${esProforma
        ? 'Este documento es una <b>PROFORMA / cotización</b>. <b>No es un comprobante electrónico</b> ni válido para efectos tributarios; es una oferta de precios sujeta a disponibilidad.'
        : doc.borrador
        ? '⚠️ Este documento es un <b>BORRADOR</b> generado en modo interino (sin firma digital ni transmisión a Hacienda). <b>No es válido para efectos tributarios</b> y no debe entregarse como factura legal.'
        : 'Comprobante electrónico autorizado por el Ministerio de Hacienda.'}
      <br>Representación gráfica · ${esProforma ? 'Proforma' : 'Factura Electrónica v4.4 (TRIBU-CR)'}.
    </div>
  </div>
  ${hayUsd ? `<script>
    function toggleMoneda() {
      var enColones = document.body.getAttribute('data-moneda') === 'crc';
      var verColones = !enColones;
      document.querySelectorAll('.m-crc').forEach(function (el) { el.style.display = verColones ? '' : 'none'; });
      document.querySelectorAll('.m-usd').forEach(function (el) { el.style.display = verColones ? 'none' : ''; });
      document.body.setAttribute('data-moneda', verColones ? 'crc' : 'usd');
      var btn = document.getElementById('curToggle');
      if (btn) btn.textContent = verColones ? '💵 Ver en dólares ($)' : '💱 Ver en colones (₡)';
    }
  </script>` : ''}
</body></html>`;
  }
}
