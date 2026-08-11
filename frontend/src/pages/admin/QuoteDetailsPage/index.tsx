import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./QuoteDetailsPage.module.css";
import { fmtFechaLocal } from "@/utils/dateUtils";
import { PageLoader } from "@/components/PageLoader";
import { LuLink, LuReceiptText, LuBriefcase, LuBan, LuPalette, LuTriangleAlert, LuHourglass, LuWallet, LuGift, LuNotebookPen } from "react-icons/lu";

// Para pantalla: usa el símbolo ₡
const fmtCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);

interface QuoteDetails {
  id: number;
  estado: string;
  color_solicitado?: string;
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
  vehiculo: { id: number; marca: string; modelo: string; año: number; estado: string; color?: string; autonomia_km?: number; potencia_hp?: number; precio_venta_usd?: number };
  vendedor?: { nombre_completo: string };
  lead?: { id: number } | null;
  motivo_cancelacion?: string;
}

export const QuoteDetailsPage = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [extendiendo, setExtendiendo] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [cancelando, setCancelando] = useState(false);

  // Detectar contexto: admin o vendedor
  const isAdmin = location.pathname.startsWith("/admin");

  // Rol del usuario
  const rolActual = (() => {
    try {
      const tok = localStorage.getItem("accessToken");
      if (!tok) return "";
      const d = jwtDecode<{ rol?: { nombre: string } }>(tok);
      return d.rol?.nombre ?? "";
    } catch { return ""; }
  })();

  const handleExtender = async (dias: number) => {
    if (!quote) return;
    setExtendiendo(true);
    try {
      const res = await apiClient.patch(`/quotes/${quote.id}/extender`, { dias });
      setQuote(prev => prev ? { ...prev, fecha_expiracion: res.data.fecha_expiracion } : prev);
      toast.success(`✅ Reserva extendida ${dias} día(s) más.`);
    } catch {
      toast.error("No se pudo extender la reserva.");
    } finally {
      setExtendiendo(false);
    }
  };
  const handleCancelarDesdeDetalle = async () => {
    if (!quote || !motivoCancel.trim()) { toast.error("Por favor ingresa un motivo."); return; }
    setCancelando(true);
    try {
      await apiClient.patch(`/quotes/${quote.id}/cancelar`, { motivo: motivoCancel });
      toast.success("Cotización cancelada y vehículo liberado.");
      setShowCancelModal(false);
      setMotivoCancel("");
      // Recargar la cotización actualizada
      const res = await apiClient.get(`/quotes/${quote.id}`);
      setQuote(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al cancelar.");
    } finally {
      setCancelando(false);
    }
  };

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

  /** Abre la proforma canónica del backend (HTML → imprimir/guardar PDF desde el navegador). */
  const verProforma = async () => {
    if (!quote) return;
    const tId = toast.loading("Generando proforma…");
    try {
      const res = await apiClient.get(`/billing/proforma/${quote.id}`, { responseType: "text" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/html" }));
      window.open(url, "_blank");
      toast.dismiss(tId);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error("No se pudo generar la proforma.", { id: tId }); }
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
          {quote.lead && <span className={styles.leadLink} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuLink size={14} /> Lead #{quote.lead.id}</span>}
        </div>
        <div className={styles.actions}>
          <button className="btn btn-principal" onClick={verProforma} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <LuReceiptText size={16} /> Ver Proforma
          </button>
          {(quote.estado === "Borrador" || quote.estado === "Enviada") && (
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                padding: "0.5rem 1rem",
                background: "#fef2f2",
                color: "#dc2626",
                border: "1.5px solid #fecaca",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <LuBan size={16} /> Cancelar cotización
            </button>
          )}
          {puedeFacturar && (
            <button className="btn btn-principal" onClick={handleIrAFacturar}
              title="Ir a facturación para completar la venta con IVA y datos de factura"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <LuBriefcase size={16} /> Facturar
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
          {quote.vehiculo.color && <span>Color disponible: {quote.vehiculo.color}</span>}
          {quote.color_solicitado && (
            <span style={{ color: "#7c3aed", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <LuPalette size={14} /> Color solicitado: {quote.color_solicitado}
            </span>
          )}
          <span>Combustible: <strong>{quote.tipo_combustible || "Eléctrico"}</strong></span>
        </div>
        <div className={styles.detailCard}>
          <h4>Reserva</h4>
          <p>{fmtFechaLocal(quote.fecha_expiracion)}</p>
          <span>Estado: <strong>{quote.estado === "Borrador" ? "Generada" : quote.estado}</strong></span>
          {(() => {
            const ms = new Date(quote.fecha_expiracion).getTime() - Date.now();
            const dias = Math.ceil(ms / (1000 * 60 * 60 * 24));
            if (quote.estado !== 'Borrador' && quote.estado !== 'Enviada') return null;
            if (dias < 0) return <span style={{ color: "#ef4444", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuTriangleAlert size={14} /> Vencida</span>;
            if (dias === 0) return <span style={{ color: "#f59e0b", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuTriangleAlert size={14} /> Vence hoy</span>;
            return <span style={{ color: dias <= 1 ? "#f59e0b" : "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuHourglass size={14} /> {dias} día(s) restante(s)</span>;
          })()}
          {/* Botón extender — solo admin */}
          {rolActual === "Administrador" && ['Borrador', 'Enviada'].includes(quote.estado) && (
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {[2, 4, 7].map(d => (
                <button
                  key={d}
                  onClick={() => handleExtender(d)}
                  disabled={extendiendo}
                  style={{
                    fontSize: "0.72rem", padding: "3px 10px",
                    background: "#f0f9ff", border: "1.5px solid #0891b2",
                    color: "#0369a1", borderRadius: "6px", cursor: "pointer", fontWeight: 700
                  }}
                >
                  +{d}d
                </button>
              ))}
              {extendiendo && <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Guardando...</span>}
            </div>
          )}
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuWallet size={16} /> Total con IVA</span>
          <span>{fmtCRC(totalIva)}</span>
        </div>

      </div>

      {quote.regalias && (
        <div className={styles.regalias}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuGift size={15} /> Regalías incluidas:</strong> {quote.regalias}
        </div>
      )}
      {quote.notas_cliente && (
        <div className={styles.notas}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuNotebookPen size={15} /> Notas:</strong> {quote.notas_cliente}
        </div>
      )}
      {quote.estado === "Cancelada" && quote.motivo_cancelacion && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderLeft: "4px solid #dc2626", borderRadius: "10px",
          padding: "1rem 1.25rem", marginTop: "1rem",
        }}>
          <strong style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuBan size={15} /> Motivo de cancelación:</strong>
          <p style={{ margin: "0.35rem 0 0", color: "#7f1d1d", fontSize: "0.92rem" }}>
            {quote.motivo_cancelacion}
          </p>
        </div>
      )}

      {quote.vehiculo.estado !== "Disponible" && (
        <p className={styles.warning}>Este vehículo ya no está disponible para la venta.</p>
      )}

      {/* ── Modal cancelar ── */}
      {showCancelModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "1rem",
          }}
          onClick={() => { setShowCancelModal(false); setMotivoCancel(""); }}
        >
          <div
            style={{
              background: "white", borderRadius: "16px", padding: "1.75rem",
              width: "100%", maxWidth: "480px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.75rem", display: "inline-flex" }}><LuBan size={28} /></span>
              <div>
                <strong style={{ display: "block", fontSize: "1rem", color: "var(--brand-dark)" }}>
                  Cancelar Cotización #{quote.id}
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  {quote.cliente.nombre_completo} — {quote.vehiculo.marca} {quote.vehiculo.modelo}
                </p>
              </div>
            </div>
            <div style={{
              background: "#fff7ed", border: "1px solid #fed7aa",
              borderLeft: "4px solid #f97316", borderRadius: "8px",
              padding: "0.65rem 1rem", fontSize: "0.85rem", color: "#9a3412", marginBottom: "1rem",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              <LuTriangleAlert size={16} /> Al cancelar, el vehículo quedará <strong>disponible</strong> nuevamente.
            </div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem" }}>
              Motivo de cancelación *
            </label>
            <textarea
              rows={4}
              placeholder="Ej: El cliente desistió de la compra, no calificó para financiamiento..."
              value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value)}
              autoFocus
              style={{
                width: "100%", border: "1.5px solid #cbd5e1", borderRadius: "8px",
                padding: "0.65rem 0.8rem", fontSize: "0.9rem", fontFamily: "inherit",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowCancelModal(false); setMotivoCancel(""); }}
                disabled={cancelando}
                style={{
                  padding: "0.55rem 1.1rem", background: "white",
                  border: "1.5px solid #e2e8f0", borderRadius: "8px",
                  fontSize: "0.88rem", fontWeight: 600, color: "#475569", cursor: "pointer",
                }}
              >
                No, mantener
              </button>
              <button
                onClick={handleCancelarDesdeDetalle}
                disabled={cancelando || !motivoCancel.trim()}
                style={{
                  padding: "0.55rem 1.25rem", background: "#dc2626", color: "white",
                  border: "none", borderRadius: "8px", fontSize: "0.88rem",
                  fontWeight: 700, cursor: "pointer", opacity: (cancelando || !motivoCancel.trim()) ? 0.5 : 1,
                }}
              >
                {cancelando ? "Cancelando..." : "Sí, cancelar cotización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
