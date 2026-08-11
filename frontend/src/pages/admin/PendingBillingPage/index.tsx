import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./PendingBillingPage.module.css";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";
import {
  LuBriefcase, LuClipboardList, LuCircleCheck, LuTriangleAlert, LuX, LuFileText, LuGift,
  LuBuilding2, LuUser, LuGlobe, LuCalendarDays, LuZap, LuLock, LuSearch, LuInbox,
  LuPaperclip, LuUpload, LuLink, LuCar, LuHourglass, LuUserCog,
} from "react-icons/lu";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Cotizacion {
  id: number;
  estado: string;
  fecha_creacion: string;
  fecha_expiracion: string;
  precio_lista: number;
  descuento_monto: number;
  precio_final: number;        // base imponible (sin IVA)
  iva_porcentaje: number;      // 13 por defecto
  iva_monto: number;           // precio_final × iva_porcentaje / 100
  total_con_iva: number;       // precio_final + iva_monto
  gasto_marchamo: number;
  gasto_inscripcion: number;
  gasto_placas: number;
  gasto_otros: number;
  gasto_otros_descripcion?: string;
  regalias?: string;
  cliente: { id: number; nombre_completo: string; cedula: string; email: string; telefono?: string };
  vehiculo: { id: number; marca: string; modelo: string; año: number; color: string; vin?: string };
  vendedor?: { nombre_completo: string };
  lead?: { id: number };
}

interface Venta {
  id: number;
  fecha_venta: string;
  monto_final: number;
  iva_monto: number;
  total_con_iva: number;
  metodo_pago: string;
  factura_nombre: string;
  factura_cedula: string;
  estado: string;
  cotizacion: { id: number; cliente: { nombre_completo: string }; vehiculo: { marca: string; modelo: string } };
  vendedor?: { nombre_completo: string };
  comprobante_gcs_path?: string | null;
}

/** Lee el rol del JWT sin hacer request adicional */
const getRolActual = (): string => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return "";
    const decoded: { rol?: { nombre: string } } = jwtDecode(token);
    return decoded.rol?.nombre ?? "";
  } catch { return ""; }
};

type TipoCedula = "fisica" | "juridica" | "extranjero";
type Tab = "pendientes" | "historial" | "buscar";

const fmtCRC = (v: number) =>
  "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Number(v) || 0);

const ESTADO_COLORS: Record<string, string> = {
  Borrador: "var(--slate-500)", Enviada: "var(--info)", Aceptada: "var(--success)",
  Rechazada: "var(--danger)", Facturada: "#7c3aed",
};

const METODOS_PAGO = ["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia bancaria", "SINPE Móvil", "Cheque", "Otro"];

// ── Componente principal ──────────────────────────────────────────────────────
const PendingBillingPage = () => {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("pendientes");
  const rolActual = getRolActual();
  const puedeFacturar = rolActual === "Administrador" || rolActual === "Contador";

  const [pendientes, setPendientes] = useState<Cotizacion[]>([]);
  const [historial, setHistorial] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Cotizacion[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Cotización seleccionada para facturar
  const [cotSeleccionada, setCotSeleccionada] = useState<Cotizacion | null>(null);

  // Formulario de facturación
  const [form, setForm] = useState({
    factura_nombre:      "",
    factura_tipo_cedula: "fisica" as TipoCedula,
    factura_cedula:      "",
    factura_email:       "",
    factura_telefono:    "",
    metodo_pago:         "Efectivo",
    factura_notas:       "",
  });
  const [procesando, setProcesando] = useState(false);
  const [depositoConfirmado, setDepositoConfirmado] = useState(false);
  const [exonerado, setExonerado] = useState(false);
  const [numeroExoneracion, setNumeroExoneracion] = useState("");
  const [fechaHistorica, setFechaHistorica] = useState("");
  const [sugefModal, setSugefModal] = useState<{ faltantes: string[]; leadId?: number } | null>(null);

  // Filtro pendientes
  const [filtroPend, setFiltroPend] = useState("");

  const fetchAll = async () => {
    try {
      const [p, v] = await Promise.all([
        apiClient.get("/billing/pending"),
        apiClient.get("/billing/ventas"),
      ]);
      setPendientes(Array.isArray(p.data) ? p.data : []);
      setHistorial(Array.isArray(v.data) ? v.data : []);
    } catch { toast.error("Error al cargar datos."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Si viene desde un lead (?leadId=X) → buscar cotizaciones de ese cliente automáticamente
  // Si viene desde una cotización directa (?cotizacionId=X) → seleccionarla
  useEffect(() => {
    const cotId  = searchParams.get("cotizacionId");
    const leadId = searchParams.get("leadId");

    if (cotId && Number(cotId) > 0) {
      apiClient.get(`/billing/pending`).then(res => {
        const cots = Array.isArray(res.data) ? res.data : [];
        const found = cots.find((c: Cotizacion) => c.id === Number(cotId));
        if (found) seleccionarCotizacion(found);
      }).catch(() => {});
    } else if (leadId) {
      // Viene del lead → cambiar a tab "buscar" y buscar las cotizaciones del lead
      setTab("buscar");
      apiClient.get(`/billing/buscar?q=lead:${leadId}`)
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setResultados(res.data);
          }
        }).catch(() => {});
    }
  }, []); // eslint-disable-line

  const pendientesFiltrados = useMemo(() => {
    if (!filtroPend) return pendientes;
    const q = filtroPend.toLowerCase();
    return pendientes.filter(c =>
      `${c.cliente.nombre_completo} ${c.cliente.cedula} ${c.vehiculo.marca} ${c.vehiculo.modelo}`.toLowerCase().includes(q)
    );
  }, [pendientes, filtroPend]);

  const buscarCotizaciones = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const res = await apiClient.get(`/billing/buscar?q=${encodeURIComponent(busqueda)}`);
      setResultados(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error("Error en la búsqueda."); }
    finally { setBuscando(false); }
  };

  const seleccionarCotizacion = (cot: Cotizacion) => {
    setCotSeleccionada(cot);
    // Pre-llenar con datos del cliente de la cotización
    setForm({
      factura_nombre:      cot.cliente.nombre_completo,
      factura_tipo_cedula: "fisica",
      factura_cedula:      cot.cliente.cedula,
      factura_email:       cot.cliente.email,
      factura_telefono:    cot.cliente.telefono ?? "",
      metodo_pago:         "Efectivo",
      factura_notas:       "",
    });
  };

  const handleFacturar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cotSeleccionada) return;
    if (!form.factura_nombre || !form.factura_cedula || !form.factura_email) {
      toast.error("Nombre, cédula y email son requeridos para la factura.");
      return;
    }
    if (!depositoConfirmado) {
      toast.error("Confirmá que el depósito/financiamiento está listo antes de facturar.");
      return;
    }
    await enviarFactura(false);
  };

  const subirComprobanteVenta = async (ventaId: number, file: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiClient.post(`/billing/ventas/${ventaId}/comprobante`, fd);
      toast.success("Comprobante adjuntado.");
      fetchAll();
    } catch { toast.error("No se pudo subir el comprobante."); }
  };

  const verComprobanteVenta = async (ventaId: number) => {
    try {
      const res = await apiClient.get(`/billing/ventas/${ventaId}/comprobante`, { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch { toast.error("No se pudo abrir el comprobante."); }
  };

  const enviarFactura = async (omitirSugef: boolean) => {
    if (!cotSeleccionada) return;
    setProcesando(true);
    try {
      await apiClient.post("/billing/facturar", {
        cotizacionId: cotSeleccionada.id,
        datos: { ...form, deposito_confirmado: true, sugef_omitir: omitirSugef, exonerado, numero_exoneracion: exonerado ? numeroExoneracion : undefined, fecha: fechaHistorica || undefined },
      });
      toast.success("✅ Venta registrada. Comprobante generado como BORRADOR (no válido fiscalmente hasta firmar con Hacienda).", { duration: 6000 });
      setCotSeleccionada(null);
      setResultados([]);
      setBusqueda("");
      setDepositoConfirmado(false);
      setExonerado(false);
      setNumeroExoneracion("");
      setFechaHistorica("");
      setSugefModal(null);
      fetchAll();
      setTab("historial");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === "SUGEF_INCOMPLETO") {
        // Mostrar modal con pendientes SUGEF
        setSugefModal({ faltantes: data.faltantes ?? [], leadId: (cotSeleccionada as any).lead?.id });
      } else {
        toast.error(data?.message || "Error al procesar la factura.");
      }
    } finally { setProcesando(false); }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner}/><p>Cargando...</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><LuBriefcase size={22} /> Facturación</h1>
        <div className={styles.kpis}>
          <span className={styles.kpiChip} style={{ background: "#e0f2fe", color: "var(--info)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <LuClipboardList size={14} /> {pendientes.length} pendientes
          </span>
          <span className={styles.kpiChip} style={{ background: "#dcfce7", color: "#166534", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <LuCircleCheck size={14} /> {historial.length} completadas
          </span>
        </div>
      </div>

      {/* Aviso: facturación electrónica en modo interino (sin llaves) */}
      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 10, padding: "0.7rem 1rem", fontSize: "0.85rem", marginBottom: "1rem", lineHeight: 1.5 }}>
        <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuTriangleAlert size={14} /> Comprobantes en modo BORRADOR.</strong> Se registran las ventas y su contabilidad,
        pero el comprobante electrónico <strong>aún no es válido fiscalmente</strong> (numeración provisional, sin firma
        ni envío a Hacienda). Se activará al cargar el certificado <code>.p12</code>. No entregar como factura legal al cliente.
      </div>

      {/* Formulario de Facturación — aparece cuando se selecciona una cotización */}
      {cotSeleccionada && (
        <div className={styles.facturaPanel}>
          <div className={styles.facturaPanelHeader}>
            <h2>Facturar Cotización #{cotSeleccionada.id}</h2>
            <button className={styles.closeFactura} onClick={() => setCotSeleccionada(null)} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuX size={15} /> Cancelar</button>
          </div>

          <div className={styles.facturaBody}>
            {/* ── Detalle de la cotización ── */}
            <div className={styles.cotResumen}>
              <div className={styles.cotResumenHeader} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><LuFileText size={16} /> Detalle de la Cotización</div>
              <div className={styles.cotResumenGrid}>
                <div>
                  <div className={styles.label}>Vehículo</div>
                  <div className={styles.value}>{cotSeleccionada.vehiculo.marca} {cotSeleccionada.vehiculo.modelo} ({cotSeleccionada.vehiculo.año})</div>
                  <div className={styles.subValue}>{cotSeleccionada.vehiculo.color}{cotSeleccionada.vehiculo.vin ? ` · VIN: ${cotSeleccionada.vehiculo.vin}` : ""}</div>
                </div>
                <div>
                  <div className={styles.label}>Cliente Original</div>
                  <div className={styles.value}>{cotSeleccionada.cliente.nombre_completo}</div>
                  <div className={styles.subValue}>{cotSeleccionada.cliente.cedula} · {cotSeleccionada.cliente.email}</div>
                </div>
                <div>
                  <div className={styles.label}>Vendedor</div>
                  <div className={styles.value}>{cotSeleccionada.vendedor?.nombre_completo ?? "—"}</div>
                </div>
                <div>
                  <div className={styles.label}>Fecha Cotización</div>
                  <div className={styles.value}>{fmtFecha(cotSeleccionada.fecha_creacion)}</div>
                </div>
              </div>

              {/* Desglose de precios */}
              <div className={styles.preciosDesglose}>
                {Number(cotSeleccionada.descuento_monto) > 0 && (
                  <>
                    <div className={styles.precioRow}><span>Precio de lista:</span><span>{fmtCRC(cotSeleccionada.precio_lista)}</span></div>
                    <div className={`${styles.precioRow} ${styles.descuento}`}><span>Descuento:</span><span>− {fmtCRC(cotSeleccionada.descuento_monto)}</span></div>
                  </>
                )}
                {Number(cotSeleccionada.gasto_marchamo) > 0 && <div className={styles.precioRow}><span>Marchamo:</span><span>{fmtCRC(cotSeleccionada.gasto_marchamo)}</span></div>}
                {Number(cotSeleccionada.gasto_inscripcion) > 0 && <div className={styles.precioRow}><span>Inscripción:</span><span>{fmtCRC(cotSeleccionada.gasto_inscripcion)}</span></div>}
                {Number(cotSeleccionada.gasto_placas) > 0 && <div className={styles.precioRow}><span>Placas:</span><span>{fmtCRC(cotSeleccionada.gasto_placas)}</span></div>}
                {Number(cotSeleccionada.gasto_otros) > 0 && <div className={styles.precioRow}><span>{cotSeleccionada.gasto_otros_descripcion || "Otros"}:</span><span>{fmtCRC(cotSeleccionada.gasto_otros)}</span></div>}
                <div className={`${styles.precioRow} ${styles.subtotalRow}`}>
                  <span>Subtotal (sin IVA):</span><span>{fmtCRC(cotSeleccionada.precio_final)}</span>
                </div>
                <div className={`${styles.precioRow} ${styles.ivaRow}`}>
                  <span>IVA ({Number(cotSeleccionada.iva_porcentaje) || 13}%):</span>
                  <span>{fmtCRC(Number(cotSeleccionada.iva_monto) || Number(cotSeleccionada.precio_final) * 0.13)}</span>
                </div>
                <div className={`${styles.precioRow} ${styles.totalFinal}`}>
                  <span>TOTAL CON IVA:</span>
                  <strong>{fmtCRC(Number(cotSeleccionada.total_con_iva) || Number(cotSeleccionada.precio_final) * 1.13)}</strong>
                </div>
              </div>

              {cotSeleccionada.regalias && (
                <div className={styles.regalias} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><LuGift size={15} /> <strong>Regalías:</strong> {cotSeleccionada.regalias}</div>
              )}
            </div>

            {/* ── Formulario de datos de facturación ── */}
            <form onSubmit={handleFacturar} className={styles.facturaForm}>
              <div className={styles.facturaFormHeader} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <LuBuilding2 size={16} /> Datos para la Factura
                <span className={styles.facturaHint}>
                  Puede ser diferente al cliente de la cotización (ej: empresa que paga)
                </span>
              </div>

              {/* Tipo de entidad */}
              <div className={styles.tipoRow}>
                {([
                  { val: "fisica",    label: "Persona Física", icon: <LuUser size={15} /> },
                  { val: "juridica",  label: "Persona Jurídica", icon: <LuBuilding2 size={15} /> },
                  { val: "extranjero", label: "Extranjero", icon: <LuGlobe size={15} /> },
                ] as { val: TipoCedula; label: string; icon: React.ReactNode }[]).map(t => (
                  <button key={t.val} type="button"
                    className={`${styles.tipoBtn} ${form.factura_tipo_cedula === t.val ? styles.tipoBtnActive : ""}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    onClick={() => setForm(f => ({ ...f, factura_tipo_cedula: t.val }))}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <div className={styles.facturaGrid}>
                <div className={styles.field}>
                  <label>{form.factura_tipo_cedula === "juridica" ? "Razón Social *" : "Nombre Completo *"}</label>
                  <input value={form.factura_nombre}
                    onChange={e => setForm(f => ({ ...f, factura_nombre: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label>{form.factura_tipo_cedula === "juridica" ? "Cédula Jurídica *" : form.factura_tipo_cedula === "extranjero" ? "Pasaporte/DIMEX *" : "Cédula *"}</label>
                  <input value={form.factura_cedula}
                    onChange={e => setForm(f => ({ ...f, factura_cedula: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label>Correo Electrónico *</label>
                  <input type="email" value={form.factura_email}
                    onChange={e => setForm(f => ({ ...f, factura_email: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label>Teléfono</label>
                  <input value={form.factura_telefono}
                    onChange={e => setForm(f => ({ ...f, factura_telefono: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Método de Pago *</label>
                  <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                    {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Notas adicionales</label>
                  <textarea rows={2} value={form.factura_notas}
                    onChange={e => setForm(f => ({ ...f, factura_notas: e.target.value }))}
                    placeholder="Observaciones para la factura..." />
                </div>

                {/* Fecha histórica (reconstrucción contable de meses atrás) */}
                <div className={styles.field}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><LuCalendarDays size={14} /> Fecha de la venta (dejar vacío = hoy)</label>
                  <input type="date" value={fechaHistorica} onChange={(e) => setFechaHistorica(e.target.value)} />
                </div>

                {/* Exoneración de IVA — vehículo eléctrico (Ley 9518) */}
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={exonerado} onChange={(e) => setExonerado(e.target.checked)} />
                    <LuZap size={14} /> Exonerado de IVA (vehículo eléctrico — Ley 9518)
                  </label>
                  {exonerado && (
                    <input
                      style={{ marginTop: "0.4rem" }}
                      value={numeroExoneracion}
                      onChange={(e) => setNumeroExoneracion(e.target.value)}
                      placeholder="N° de autorización de exoneración (Hacienda)"
                    />
                  )}
                </div>
              </div>

              {/* Resumen final */}
              <div className={styles.facturaResumen}>
                <div className={styles.facturaResumenRow}>
                  <span>Facturar a:</span>
                  <strong>{form.factura_nombre || "—"}</strong>
                </div>
                <div className={styles.facturaResumenRow}>
                  <span>{form.factura_tipo_cedula === "juridica" ? "C.Jurídica:" : "Cédula:"}</span>
                  <strong>{form.factura_cedula || "—"}</strong>
                </div>
                <div className={styles.facturaResumenRow}>
                  <span>Método de pago:</span>
                  <strong>{form.metodo_pago}</strong>
                </div>
                <div className={styles.facturaResumenRow}>
                  <span>Subtotal sin IVA:</span>
                  <span>{fmtCRC(cotSeleccionada.precio_final)}</span>
                </div>
                <div className={`${styles.facturaResumenRow} ${styles.ivaResumenRow}`}>
                  <span>IVA ({exonerado ? "exonerado" : `${Number(cotSeleccionada.iva_porcentaje) || 13}%`}):</span>
                  <span>{exonerado ? (<span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuZap size={13} /> ₡0 (Ley 9518)</span>) : fmtCRC(Number(cotSeleccionada.iva_monto) || Number(cotSeleccionada.precio_final) * 0.13)}</span>
                </div>
                <div className={`${styles.facturaResumenRow} ${styles.totalRow}`}>
                  <span>TOTAL A COBRAR:</span>
                  <strong className={styles.totalMonto}>
                    {fmtCRC(exonerado ? Number(cotSeleccionada.precio_final) : (Number(cotSeleccionada.total_con_iva) || Number(cotSeleccionada.precio_final) * 1.13))}
                  </strong>
                </div>
              </div>

              {/* Bloquear si el usuario es Vendedor */}
              {!puedeFacturar ? (
                <div className={styles.rolBloqueado} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <LuLock size={15} /> Solo un <strong>Administrador</strong> o <strong>Contador</strong> puede completar la venta.
                  Solicite la aprobación a su supervisor.
                </div>
              ) : (
                <>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "0.6rem 0.8rem", margin: "0.5rem 0", fontSize: "0.85rem", color: "#92400e", cursor: "pointer" }}>
                    <input type="checkbox" checked={depositoConfirmado} onChange={(e) => setDepositoConfirmado(e.target.checked)} style={{ marginTop: 3 }} />
                    <span>Confirmo que el <strong>depósito / financiamiento está listo</strong> y validado con el banco para firmar.</span>
                  </label>
                  <button type="submit" className={styles.facturarBtn} disabled={procesando || !depositoConfirmado} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                    {procesando ? "Procesando..." : (<><LuBriefcase size={15} /> Completar Venta · {fmtCRC(Number(cotSeleccionada.total_con_iva) || Number(cotSeleccionada.precio_final) * 1.13)}</>)}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      {!cotSeleccionada && (
        <>
          <div className={styles.tabBar}>
            <button className={`${styles.tab} ${tab === "pendientes" ? styles.tabActive : ""}`} onClick={() => setTab("pendientes")} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuClipboardList size={15} /> Pendientes ({pendientes.length})
            </button>
            <button className={`${styles.tab} ${tab === "buscar" ? styles.tabActive : ""}`} onClick={() => setTab("buscar")} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuSearch size={15} /> Buscar Cliente
            </button>
            <button className={`${styles.tab} ${tab === "historial" ? styles.tabActive : ""}`} onClick={() => setTab("historial")} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuCircleCheck size={15} /> Historial ({historial.length})
            </button>
          </div>

          {/* ══ TAB: Pendientes ══════════════════════════════════════════════ */}
          {tab === "pendientes" && (
            <>
              <input className={styles.filterInput} placeholder="🔍 Filtrar por cliente, cédula o vehículo..."
                value={filtroPend} onChange={e => setFiltroPend(e.target.value)} />
              {pendientesFiltrados.length === 0 && (
                <div className={styles.empty}>
                  <LuInbox size={22} />
                  <p>No hay cotizaciones pendientes de facturación.</p>
                </div>
              )}
              <div className={styles.cotGrid}>
                {pendientesFiltrados.map(c => (
                  <CotizacionCard key={c.id} cot={c} onSelect={seleccionarCotizacion} />
                ))}
              </div>
            </>
          )}

          {/* ══ TAB: Buscar ══════════════════════════════════════════════════ */}
          {tab === "buscar" && (
            <>
              <div className={styles.buscarRow}>
                <input className={styles.buscarInput} placeholder="Buscar por nombre, cédula o email del cliente..."
                  value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") buscarCotizaciones(); }} />
                <button className={styles.buscarBtn} onClick={buscarCotizaciones} disabled={buscando}>
                  {buscando ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {resultados.length === 0 && busqueda && !buscando && (
                <div className={styles.empty}><LuSearch size={22} /><p>No se encontraron cotizaciones activas para esa búsqueda.</p></div>
              )}
              <div className={styles.cotGrid}>
                {resultados.map(c => (
                  <CotizacionCard key={c.id} cot={c} onSelect={seleccionarCotizacion} />
                ))}
              </div>
            </>
          )}

          {/* ══ TAB: Historial ═══════════════════════════════════════════════ */}
          {tab === "historial" && (
            <div className={styles.historialTable}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Fecha</th><th>Facturado a</th><th>Vehículo</th>
                    <th>Vendedor</th><th>Pago</th><th>Monto</th><th>Estado</th><th>Doc.</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--slate-400)", padding: "2rem" }}>Sin ventas aún.</td></tr>
                  )}
                  {historial.map(v => (
                    <tr key={v.id}>
                      <td>#{v.id}</td>
                      <td>{fmtFecha(v.fecha_venta)}</td>
                      <td>
                        <strong>{v.factura_nombre || v.cotizacion?.cliente?.nombre_completo || "—"}</strong>
                        {v.factura_cedula && <div style={{ fontSize: "0.75rem", color: "var(--slate-400)" }}>{v.factura_cedula}</div>}
                      </td>
                      <td>{v.cotizacion?.vehiculo ? `${v.cotizacion.vehiculo.marca} ${v.cotizacion.vehiculo.modelo}` : "—"}</td>
                      <td style={{ fontSize: "0.82rem" }}>{v.vendedor?.nombre_completo ?? "—"}</td>
                      <td style={{ fontSize: "0.82rem" }}>{v.metodo_pago}</td>
                      <td>
                        <strong style={{ color: "var(--success)" }}>{fmtCRC(Number(v.total_con_iva) || Number(v.monto_final))}</strong>
                        {Number(v.iva_monto) > 0 && <div style={{ fontSize: "0.72rem", color: "var(--slate-500)" }}>IVA: {fmtCRC(v.iva_monto)}</div>}
                      </td>
                      <td><span className={styles.estadoOk} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuCircleCheck size={13} /> {v.estado}</span></td>
                      <td>
                        {v.comprobante_gcs_path ? (
                          <button onClick={() => verComprobanteVenta(v.id)} title="Ver documento adjunto" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", display: "inline-flex", alignItems: "center" }}><LuPaperclip size={16} /></button>
                        ) : (
                          <label title="Adjuntar documento (foto o PDF)" style={{ cursor: "pointer", color: "var(--slate-500)", display: "inline-flex", alignItems: "center" }}>
                            <LuUpload size={16} />
                            <input type="file" accept="image/*,application/pdf" capture="environment" style={{ display: "none" }} onChange={(e) => subirComprobanteVenta(v.id, e.target.files?.[0] ?? null)} />
                          </label>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de verificación SUGEF */}
      {sugefModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 26, width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 8px", color: "#92400e", display: "flex", alignItems: "center", gap: "0.4rem" }}><LuTriangleAlert size={17} /> Cumplimiento SUGEF incompleto</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--slate-600)", margin: "0 0 12px" }}>
              El expediente de este cliente tiene <strong>{sugefModal.faltantes.length}</strong> campo(s) pendiente(s) para cumplir con SUGEF:
            </p>
            <ul style={{ fontSize: "0.85rem", color: "var(--slate-700)", margin: "0 0 16px", paddingLeft: 18 }}>
              {sugefModal.faltantes.map((f) => (
                <li key={f}>{f.replace(/_/g, " ")}</li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {sugefModal.leadId && (
                <a href={`/admin/leads/${sugefModal.leadId}`} className="btn btn-principal" style={{ textDecoration: "none" }}>
                  Completar ahora
                </a>
              )}
              <button className="btn btn-secondary" onClick={() => setSugefModal(null)}>Cancelar</button>
              <button
                onClick={() => enviarFactura(true)}
                disabled={procesando}
                style={{ background: "var(--danger)", color: "#fff", border: "none", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700 }}
              >
                Facturar de todas formas
              </button>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-400)", margin: "10px 0 0" }}>
              "Facturar de todas formas" registra el incumplimiento en el historial del lead.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-componente: Tarjeta de cotización ─────────────────────────────────────
const CotizacionCard = ({ cot, onSelect }: { cot: Cotizacion; onSelect: (c: Cotizacion) => void }) => {
  const totalGastos = [cot.gasto_marchamo, cot.gasto_inscripcion, cot.gasto_placas, cot.gasto_otros]
    .reduce((s, v) => s + Number(v || 0), 0);
  const expirado = new Date(cot.fecha_expiracion) < new Date();

  const fmtCRC = (v: number) => "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Number(v) || 0);

  return (
    <div className={`${styles.cotCard} ${expirado ? styles.cotExpirada : ""}`}>
      <div className={styles.cotCardHeader}>
        <span className={styles.cotId}>#{cot.id}</span>
        <span className={styles.cotEstado} style={{ background: ESTADO_COLORS[cot.estado] ?? "var(--slate-500)" }}>
          {cot.estado}
        </span>
        {cot.lead && <span className={styles.leadBadge} title={`Lead #${cot.lead.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuLink size={12} /> Lead</span>}
      </div>

      <div className={styles.cotCardBody}>
        <div className={styles.cotCliente}>
          <strong>{cot.cliente.nombre_completo}</strong>
          <span>{cot.cliente.cedula}</span>
        </div>
        <div className={styles.cotVehiculo} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <LuCar size={15} /> {cot.vehiculo.marca} {cot.vehiculo.modelo} ({cot.vehiculo.año}) — {cot.vehiculo.color}
        </div>
        <div className={styles.cotMeta}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuCalendarDays size={13} /> {fmtFecha(cot.fecha_creacion)}</span>
          <span className={expirado ? styles.expiradoText : ""} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            {expirado ? (<><LuTriangleAlert size={13} /> Venció</>) : (<><LuHourglass size={13} /> Vence</>)}: {fmtFechaLocal(cot.fecha_expiracion as unknown as string)}
          </span>
          {cot.vendedor && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuUserCog size={13} /> {cot.vendedor.nombre_completo}</span>}
        </div>
        <div className={styles.cotTotal}>
          <span>Total al cliente:</span>
          <strong>{fmtCRC(cot.precio_final)}</strong>
          {totalGastos > 0 && <span className={styles.incGastos}>incl. inscripción</span>}
        </div>
      </div>

      <button className={styles.facturarCardBtn} onClick={() => onSelect(cot)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
        <LuBriefcase size={15} /> Iniciar Facturación →
      </button>
    </div>
  );
};

export default PendingBillingPage;
