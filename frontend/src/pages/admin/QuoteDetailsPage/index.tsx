import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/img/Logos/Logo-Conejo-Motors.png";
import styles from "./QuoteDetailsPage.module.css";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";
import { PageLoader } from "@/components/PageLoader";

// Para pantalla: usa el símbolo ₡
const fmtCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);

// Para PDF: jsPDF/Helvetica no soporta ₡ (U+20A1), se usa "CRC" que es el formato ISO estándar
const fmtPDF = (value: number) =>
  "CRC " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(value);

interface QuoteDetails {
  id: number;
  estado: string;
  precio_lista: number;
  descuento_monto: number;
  precio_final: number;        // base imponible
  iva_porcentaje: number;      // 13 por defecto
  iva_monto: number;           // precio_final × iva / 100
  total_con_iva: number;       // precio_final + iva_monto
  gasto_marchamo: number;
  gasto_inscripcion: number;
  gasto_placas: number;
  gasto_otros: number;
  gasto_otros_descripcion: string;
  tipo_combustible?: string;
  regalias: string;
  notas_cliente: string;
  fecha_creacion: string;
  fecha_expiracion: string;
  cliente: { nombre_completo: string; cedula: string; email?: string; telefono?: string };
  vehiculo: { id: number; marca: string; modelo: string; año: number; estado: string; color?: string; autonomia_km?: number; potencia_hp?: number };
  vendedor?: { nombre_completo: string };
  lead?: { id: number } | null;
}

export const QuoteDetailsPage = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quote, setQuote] = useState<QuoteDetails | null>(null);

  // Detectar contexto: admin o vendedor
  const isAdmin = location.pathname.startsWith("/admin");
  const billingPath = isAdmin ? "/admin/billing" : "/admin/billing";

  useEffect(() => {
    apiClient.get(`/quotes/${quoteId}`)
      .then((res) => setQuote(res.data))
      .catch(() => toast.error("No se pudo cargar la cotización."));
  }, [quoteId]);

  /** Redirige a la página de facturación pre-cargando esta cotización */
  const handleIrAFacturar = () => {
    navigate(`${billingPath}?cotizacionId=${quote!.id}`);
  };

  const handleDownloadPDF = () => {
    if (!quote) return;
    const doc = new jsPDF();
    const pW = doc.internal.pageSize.width;
    const pH = doc.internal.pageSize.height;
    const margin = 14;
    const colWidth = pW - 2 * margin;
    const primaryColor: [number, number, number] = [2, 79, 125];
    const darkColor: [number, number, number] = [10, 37, 64];

    const { cliente, vehiculo, vendedor } = quote;
    const nombreVendedor = vendedor?.nombre_completo || "Equipo de Ventas";

    // ── ENCABEZADO ─────────────────────────────
    // Fondo azul oscuro
    doc.setFillColor(...darkColor);
    doc.rect(0, 0, pW, 40, "F");

    // Logo
    doc.addImage(logo, "PNG", margin, 6, 28, 28);

    // Título derecha
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURA PROFORMA", pW - margin, 18, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Cotización N° ${quote.id}`, pW - margin, 26, { align: "right" });
    doc.text(`Fecha: ${fmtFecha(quote.fecha_creacion)}`, pW - margin, 32, { align: "right" });

    let y = 48;

    // ── DATOS DEL CLIENTE Y VEHÍCULO ───────────
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: y,
      head: [["DATOS DEL CLIENTE", "VEHÍCULO COTIZADO"]],
      body: [[
        `${cliente.nombre_completo}\nCédula/ID: ${cliente.cedula}${cliente.telefono ? "\nTel: " + cliente.telefono : ""}${cliente.email ? "\nEmail: " + cliente.email : ""}`,
        `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año}${vehiculo.color ? "\nColor: " + vehiculo.color : ""}\nTipo combustible: ${quote.tipo_combustible || "Electrico"}${vehiculo.autonomia_km ? "\nAutonomía: " + vehiculo.autonomia_km + " km" : ""}${vehiculo.potencia_hp ? "\nPotencia: " + vehiculo.potencia_hp + " HP" : ""}`,
      ]],
      theme: "grid",
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: colWidth / 2 }, 1: { cellWidth: colWidth / 2 } },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── DESGLOSE DEL PRECIO (limpio para el cliente) ────────────────────
    // Los gastos de inscripción son internos — no se muestran en la proforma
    const priceRows: [string, string, string][] = [];

    // Si hay descuento, mostrar precio de lista y descuento
    if (Number(quote.descuento_monto) > 0) {
      priceRows.push(["Precio de lista", "", fmtPDF(Number(quote.precio_lista || quote.precio_final))]);
      priceRows.push(["Descuento aplicado", "", `– ${fmtPDF(Number(quote.descuento_monto))}`]);
    }

    // Línea del vehículo — precio final (ya incluye todo internamente)
    priceRows.push([
      `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año}`,
      quote.tipo_combustible || "Eléctrico",
      fmtPDF(Number(quote.precio_final)),
    ]);

    // Calcular IVA para el PDF
    const pdfIvaPct   = Number(quote.iva_porcentaje) || 13;
    const pdfIvaMonto = Number(quote.iva_monto) || Math.round(Number(quote.precio_final) * pdfIvaPct / 100);
    const pdfTotalIva = Number(quote.total_con_iva) || (Number(quote.precio_final) + pdfIvaMonto);

    autoTable(doc, {
      startY: y,
      head: [["DESCRIPCIÓN", "COMBUSTIBLE", "MONTO (CRC)"]],
      body: priceRows,
      foot: [
        ["Base imponible (sin IVA)", "", fmtPDF(Number(quote.precio_final))],
        [`IVA (${pdfIvaPct}% desglosado)`, "", fmtPDF(pdfIvaMonto)],
        ["PRECIO TOTAL (IVA incluido)", "", fmtPDF(pdfTotalIva)],
      ],
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      footStyles: { fontStyle: "bold", fontSize: 9, fillColor: [0, 64, 0] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
      columnStyles: {
        0: { cellWidth: colWidth * 0.55 },
        1: { cellWidth: colWidth * 0.2 },
        2: { cellWidth: colWidth * 0.25, halign: "right" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── REGALÍAS ────────────────────────────────
    if (quote.regalias && quote.regalias.trim()) {
      autoTable(doc, {
        startY: y,
        head: [["🎁 REGALÍAS E INCENTIVOS INCLUIDOS"]],
        body: [[quote.regalias]],
        theme: "grid",
        headStyles: { fillColor: [0, 150, 100], textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── NOTAS ADICIONALES ───────────────────────
    const notas: string[] = [
      `• Esta proforma es válida hasta el: ${fmtFechaLocal(quote.fecha_expiracion)}.`,
    ];
    if (quote.notas_cliente?.trim()) {
      notas.push(`• ${quote.notas_cliente}`);
    }

    autoTable(doc, {
      startY: y,
      head: [["CONDICIONES Y NOTAS"]],
      body: notas.map((n) => [n]),
      theme: "plain",
      headStyles: { fillColor: [245, 245, 245], textColor: darkColor, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [80, 80, 80] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // ── FIRMA ───────────────────────────────────
    if (y > pH - 55) { doc.addPage(); y = 20; }

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 20, margin + 70, y + 20);
    doc.setFontSize(9);
    doc.setTextColor(...darkColor);
    doc.text(nombreVendedor, margin, y + 26);
    doc.setTextColor(100, 100, 100);
    doc.text("Asesor de Ventas — Conejo Motors", margin, y + 32);

    // Conejo Motors info derecha
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Conejo Motors S.A.", pW - margin, y + 20, { align: "right" });
    doc.text("Venta de Vehículos Eléctricos BYD", pW - margin, y + 26, { align: "right" });
    doc.text("info@conejomotors.cr | (506) 0000-0000", pW - margin, y + 32, { align: "right" });

    doc.save(`Proforma_${quote.id}_${cliente.nombre_completo.replace(/\s/g, "_")}.pdf`);
  };

  if (!quote) return <PageLoader message="Cargando cotización..." />;

  const totalGastos = [quote.gasto_marchamo, quote.gasto_inscripcion, quote.gasto_placas, quote.gasto_otros]
    .reduce((s, v) => s + Number(v || 0), 0);
  
  // IVA — usa los valores guardados o calcula si son 0 (cotizaciones antiguas)
  const ivaPct   = Number(quote.iva_porcentaje) || 13;
  const ivaMonto = Number(quote.iva_monto) || Math.round(Number(quote.precio_final) * ivaPct / 100);
  const totalIva = Number(quote.total_con_iva) || (Number(quote.precio_final) + ivaMonto);
  const puedeFacturar = quote.estado !== "Facturada" && quote.estado !== "Rechazada";

  return (
    <div className={styles.detailsContainer}>
      <div className={styles.header}>
        <div>
          <h1>Cotización #{quote.id}</h1>
          {quote.lead && <span className={styles.leadLink}>🔗 Lead #{quote.lead.id}</span>}
        </div>
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={handleDownloadPDF}>
            📄 Descargar Proforma PDF
          </button>
          {puedeFacturar && (
            <button className="btn btn-principal" onClick={handleIrAFacturar}
              title="Ir a facturación para completar la venta con IVA y datos de factura">
              💼 Facturar
            </button>
          )}
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <h4>Cliente</h4>
          <p>{quote.cliente.nombre_completo}</p>
          <span>Cédula: {quote.cliente.cedula}</span>
          {quote.cliente.telefono && <span>Tel: {quote.cliente.telefono}</span>}
        </div>
        <div className={styles.detailCard}>
          <h4>Vehículo</h4>
          <p>{quote.vehiculo.marca} {quote.vehiculo.modelo} ({quote.vehiculo.año})</p>
          <span>Estado: {quote.vehiculo.estado}</span>
          {quote.vehiculo.color && <span>Color: {quote.vehiculo.color}</span>}
          <span>Combustible: <strong>{quote.tipo_combustible || "Eléctrico"}</strong></span>
        </div>
        <div className={styles.detailCard}>
          <h4>Validez</h4>
          <p>{fmtFechaLocal(quote.fecha_expiracion)}</p>
          <span>Estado: {quote.estado}</span>
        </div>
      </div>

      {/* Desglose de precios */}
      <div className={styles.priceBreakdown}>
        <h3>Desglose de Precios (vista cliente)</h3>

        {/* Descuento si aplica */}
        {Number(quote.descuento_monto) > 0 && (
          <>
            <div className={styles.priceRow}>
              <span>Precio de lista</span>
              <span>{fmtCRC(Number(quote.precio_lista || quote.precio_final))}</span>
            </div>
            <div className={`${styles.priceRow} ${styles.discount}`}>
              <span>Descuento</span>
              <span>− {fmtCRC(Number(quote.descuento_monto))}</span>
            </div>
          </>
        )}

        {/* Precio del vehículo — limpio, sin desglose de gastos para el cliente */}
        <div className={`${styles.priceRow} ${styles.subtotal}`}>
          <span>{quote.vehiculo.marca} {quote.vehiculo.modelo} {quote.vehiculo.año}</span>
          <span>{fmtCRC(Number(quote.total_con_iva) || Number(quote.precio_final))}</span>
        </div>

        {/* Desglose IVA */}
        <div className={`${styles.priceRow} ${styles.subtotalLine}`}>
          <span>Base imponible (sin IVA)</span>
          <span>{fmtCRC(Number(quote.precio_final))}</span>
        </div>
        <div className={`${styles.priceRow} ${styles.ivaLine}`}>
          <span>IVA ({ivaPct}%)</span>
          <span>+ {fmtCRC(ivaMonto)}</span>
        </div>
        <div className={`${styles.priceRow} ${styles.total}`}>
          <span>💰 Total con IVA</span>
          <span>{fmtCRC(totalIva)}</span>
        </div>

      </div>

      {quote.regalias && (
        <div className={styles.regalias}>
          <strong>🎁 Regalías incluidas:</strong> {quote.regalias}
        </div>
      )}
      {quote.notas_cliente && (
        <div className={styles.notas}>
          <strong>📝 Notas:</strong> {quote.notas_cliente}
        </div>
      )}

      {quote.vehiculo.estado !== "Disponible" && (
        <p className={styles.warning}>Este vehículo ya no está disponible para la venta.</p>
      )}
    </div>
  );
};
