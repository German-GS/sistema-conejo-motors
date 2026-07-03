// frontend/src/pages/admin/sales/LeadDetailsPage.tsx
import { useState, useEffect, type ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./LeadDetailsPage.module.css";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";
import { PageLoader } from "@/components/PageLoader";

interface Actividad {
  id: number;
  tipo: string;
  descripcion: string;
  fecha_creacion: string;
  entidad?: string;
  estado_fin?: string;
  usuario?: { nombre_completo: string };
}

interface Vendedor {
  id: number;
  nombre_completo: string;
}

interface Financiamiento {
  id?: number;
  entidad: string;
  estado: string;
  monto_solicitado?: number;
  monto_aprobado?: number;
  plazo_meses?: number;
  tasa_anual?: number;
  notas?: string;
  fecha_envio?: string;
  fecha_respuesta?: string;
  fecha_proximo_seguimiento?: string;
}

interface LeadDocumento {
  id: number;
  nombre: string;
  tipo_mime?: string;
  tipo?: string;
  tamano_bytes: number;
  fecha_creacion: string;
  fecha_expiracion: string;
  actividad_id?: number;
  subido_por?: { nombre_completo: string };
}

interface CotizacionResumen {
  id: number;
  estado: string;
  total_con_iva: number;
  fecha_creacion: string;
  fecha_expiracion: string;
  vehiculo: { marca: string; modelo: string; año: number };
  vendedor?: { nombre_completo: string };
}

interface LeadDetails {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string;
  cedula_cliente?: string;
  whatsapp_cliente?: string;
  estado: string;
  fuente: string;
  notas?: string;
  fecha_followup?: string;
  contacted_by_email: boolean;
  contacted_by_phone: boolean;
  contacted_by_whatsapp: boolean;
  tipo_pago?: 'Contado' | 'Crédito';
  prima_disponible?: number | string | null;
  temperatura?: 'Caliente' | 'Tibio' | 'Frio' | null;
  ultima_etapa?: string | null;
  fecha_creacion: string;
  vehiculo_interes?: { id: number; marca: string; modelo: string; año: number };
  vendedor_asignado?: Vendedor;
  campana?: { id: number; nombre: string; plataforma: string } | null;
  actividades?: Actividad[];
}

const FUENTE_ICONS: Record<string, string> = {
  Web: "🌐", Instagram: "📸", Facebook: "👍", WhatsApp: "💬",
  TikTok: "🎵", Referido: "🤝", Presencial: "🏢", Otro: "📋",
};

const TIPO_ICONS: Record<string, string> = {
  nota: "📝", llamada: "📞", email: "📧", whatsapp: "💬",
  reunion: "🤝", estado_cambio: "🔄", cotizacion_creada: "📄", financiera: "🏦",
};

// Tipos que el usuario puede elegir manualmente al registrar una actividad
const TIPOS_MANUALES = ["nota", "llamada", "email", "whatsapp", "reunion"];

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: "#3b82f6", Contactado: "#f59e0b", "En Progreso": "#8b5cf6",
  Cerrado: "#10b981", Perdido: "#ef4444", Descartado: "#94a3b8",
};

const TEMPERATURAS: { value: "Caliente" | "Tibio" | "Frio"; label: string; color: string }[] = [
  { value: "Caliente", label: "🔥 Caliente", color: "#ef4444" },
  { value: "Tibio",    label: "🌤️ Tibio",    color: "#f59e0b" },
  { value: "Frio",     label: "❄️ Frío",     color: "#3b82f6" },
];
const TEMP_COLOR: Record<string, string> = { Caliente: "#ef4444", Tibio: "#f59e0b", Frio: "#3b82f6" };

const ETAPAS = [
  "Preguntó precio",
  "Preguntó garantía/specs",
  "Pidió ubicación o fotos",
  "Pidió test drive",
  "Cotización solicitada",
];

const NACIONALIDADES = ["Costarricense", "Nicaragüense", "Panameña", "Colombiana", "Venezolana", "Estadounidense", "Otra"];

const TIPOS_DOC = [
  { value: "otro", label: "Otro" },
  { value: "cedula", label: "Cédula" },
  { value: "constancia_salarial", label: "Constancia salarial" },
  { value: "estado_cuenta", label: "Estado de cuenta" },
  { value: "carta_bancaria", label: "Carta bancaria" },
  { value: "declaracion_firmada", label: "Declaración firmada" },
];

// Normaliza un teléfono a formato internacional CR (506XXXXXXXX)
const normalizarTelCR = (tel?: string): string | null => {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length === 8) return `506${d}`;
  if (d.length === 11 && d.startsWith("506")) return d;
  if (d.length >= 8) return d; // ya trae código de país
  return null;
};

const waLink = (tel506: string, texto: string) =>
  `https://wa.me/${tel506}?text=${encodeURIComponent(texto)}`;

export const LeadDetailsPage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Admin accede por /admin/leads, vendedor por /sales/leads
  const catalogBase = location.pathname.startsWith("/admin")
    ? "/admin/sales/catalog"
    : "/sales/catalog";
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [campanasActivas, setCampanasActivas] = useState<{ id: number; nombre: string; plataforma: string }[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [documentos, setDocumentos] = useState<LeadDocumento[]>([]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  // SUGEF / KYC
  const [sugef, setSugef] = useState<any>({ kyc: null, faltantes: [], retencion: null, bajoRetencion: false });
  const [saving, setSaving] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreEdit, setNombreEdit] = useState("");
  const [solicitandoFactura, setSolicitandoFactura] = useState(false);
  const [facturaEnviada, setFacturaEnviada] = useState(false);
  const billingBase = location.pathname.startsWith("/admin") ? "/admin/billing" : "/sales/billing";

  // Leer rol del token para saber si puede ir directo a billing o solo solicitar
  const rolActual = (() => {
    try {
      const tok = localStorage.getItem("accessToken");
      if (!tok) return "";
      const d: { rol?: { nombre: string } } = jwtDecode(tok);
      return d.rol?.nombre ?? "";
    } catch { return ""; }
  })();
  const esVendedor = rolActual === "Vendedor";

  // Form de actividad nueva
  const [tipoAct, setTipoAct] = useState("nota");
  const [descAct, setDescAct] = useState("");
  const [addingAct, setAddingAct] = useState(false);
  const [adjuntosAct, setAdjuntosAct] = useState<File[]>([]);
  // Vincular la nota a una financiera (opcional)
  const [actEntidad, setActEntidad] = useState("");
  const [actEstadoFin, setActEstadoFin] = useState("Enviado");
  const [actProxSeg, setActProxSeg] = useState("");

  // Financiamiento
  const [financiamientos, setFinanciamientos] = useState<Financiamiento[]>([]);
  const [entidadesFin, setEntidadesFin] = useState<{ id: number; nombre: string; documentos: { id: number; nombre: string; url: string; tipo_mime?: string }[] }[]>([]);

  const ENTIDADES = entidadesFin.length
    ? entidadesFin.map((e) => e.nombre)
    : ["Lafise", "Banco Promerica", "Davivienda", "Coopenae", "Flexi Leasing"];
  const ESTADOS_FIN = ["Pendiente", "Enviado", "En Revisión", "Pre-Aprobado", "Aprobado", "Rechazado", "Desistió"];
  const ESTADO_FIN_COLORS: Record<string, string> = {
    "Pendiente": "#94a3b8", "Enviado": "#3b82f6", "En Revisión": "#f59e0b",
    "Pre-Aprobado": "#8b5cf6", "Aprobado": "#10b981", "Rechazado": "#ef4444",
    "Desistió": "#78716c",
  };

  const cargarFinanciamientos = () => {
    if (!leadId) return;
    apiClient.get(`/leads/${leadId}/financiamientos`)
      .then((res) => setFinanciamientos(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!leadId) return;
    apiClient.get(`/leads/${leadId}`)
      .then((res) => setLead(res.data))
      .catch(() => toast.error("No se pudo cargar el lead."));
    apiClient.get(`/leads/${leadId}/financiamientos`)
      .then((res) => setFinanciamientos(res.data))
      .catch(() => {});
    apiClient.get("/users")
      .then((res) => setVendedores(res.data.filter((u: any) => u.rol?.nombre === "Vendedor" || u.rol?.nombre === "Administrador")))
      .catch(() => {});
    apiClient.get("/campanas/activas")
      .then((res) => setCampanasActivas(res.data))
      .catch(() => {});
    apiClient.get(`/quotes/by-lead/${leadId}`)
      .then((res) => setCotizaciones(res.data))
      .catch(() => {});
    apiClient.get(`/leads/${leadId}/documentos`)
      .then((res) => setDocumentos(res.data))
      .catch(() => {});
    apiClient.get("/entidades-financieras/activas")
      .then((res) => setEntidadesFin(res.data))
      .catch(() => {});
    apiClient.get(`/leads/${leadId}/sugef`)
      .then((res) => setSugef(res.data))
      .catch(() => {});
  }, [leadId]);

  const guardarKycObj = (obj: Record<string, any>) => {
    if (!lead || sugef.bajoRetencion) return;
    apiClient.patch(`/leads/${lead.id}/sugef`, obj)
      .then((res) => setSugef((prev: any) => ({ ...prev, kyc: res.data.kyc, faltantes: res.data.faltantes })))
      .catch(() => toast.error("No se pudo guardar el dato SUGEF."));
  };
  const guardarKyc = (campo: string, valor: any) => guardarKycObj({ [campo]: valor });

  const cargarDocumentos = () => {
    if (!leadId) return;
    apiClient.get(`/leads/${leadId}/documentos`)
      .then((res) => setDocumentos(res.data))
      .catch(() => {});
  };

  /** Sube uno o varios archivos. Devuelve cuántos se subieron OK. */
  const subirArchivos = async (files: File[], actividadId?: number): Promise<number> => {
    if (!lead) return 0;
    let okCount = 0;
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`"${file.name}" supera el límite de 15 MB.`);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (actividadId) fd.append("actividadId", String(actividadId));
        await apiClient.post(`/leads/${lead.id}/documentos`, fd);
        okCount++;
      } catch (err: any) {
        toast.error(err.response?.data?.message || `No se pudo subir "${file.name}".`);
      }
    }
    return okCount;
  };

  const handleSubirDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permitir resubir los mismos archivos
    if (!files.length || !lead) return;
    setSubiendoDoc(true);
    try {
      const ok = await subirArchivos(files);
      if (ok > 0) {
        toast.success(`📎 ${ok} documento(s) subido(s).`);
        cargarDocumentos();
      }
    } finally {
      setSubiendoDoc(false);
    }
  };

  const handleDescargarDoc = async (doc: LeadDocumento) => {
    if (!lead) return;
    setDescargandoId(doc.id);
    try {
      const res = await apiClient.get(
        `/leads/${lead.id}/documentos/${doc.id}/descargar`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar el documento.");
    } finally {
      setDescargandoId(null);
    }
  };

  const handleEliminarDoc = async (doc: LeadDocumento) => {
    if (!lead) return;
    if (!window.confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiClient.delete(`/leads/${lead.id}/documentos/${doc.id}`);
      toast.success("Documento eliminado.");
      setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo eliminar.");
    }
  };

  const save = async (updates: Partial<LeadDetails>) => {
    if (!lead) return;
    setSaving(true);
    try {
      const payload: any = { ...updates };
      if ((updates as any).vendedor_asignado_id) {
        payload.vendedor_asignado_id = (updates as any).vendedor_asignado_id;
      }
      const res = await apiClient.patch(`/leads/${lead.id}`, payload);
      setLead((prev) => prev ? { ...prev, ...res.data } : prev);
      toast.success("Guardado.");
    } catch {
      toast.error("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const escribirWhatsApp = async (texto: string) => {
    if (!lead) return;
    const tel = normalizarTelCR(lead.telefono_cliente);
    if (!tel) { toast.error("El lead no tiene un teléfono válido."); return; }
    // Abrir WhatsApp con el mensaje precargado
    window.open(waLink(tel, texto), "_blank", "noopener");
    // Marcar contactado por WhatsApp y registrar en el timeline
    try {
      const [, actRes] = await Promise.all([
        apiClient.patch(`/leads/${lead.id}`, { contacted_by_whatsapp: true }),
        apiClient.post(`/leads/${lead.id}/actividades`, {
          tipo: "whatsapp",
          descripcion: `Mensaje de WhatsApp enviado: "${texto}"`,
        }),
      ]);
      setLead((prev) => prev ? {
        ...prev,
        contacted_by_whatsapp: true,
        actividades: [actRes.data, ...(prev.actividades ?? [])],
      } : prev);
    } catch { /* el chat ya se abrió; no bloquear */ }
  };

  const handleAddActividad = async () => {
    const esFinanciera = !!actEntidad;
    if (!lead || (!descAct.trim() && adjuntosAct.length === 0 && !esFinanciera)) return;
    setAddingAct(true);
    try {
      const descripcion =
        descAct.trim() ||
        (esFinanciera
          ? `${actEntidad}: ${actEstadoFin}`
          : `Adjuntó ${adjuntosAct.length} documento(s).`);
      const res = await apiClient.post(`/leads/${lead.id}/actividades`, {
        tipo: esFinanciera ? "financiera" : tipoAct,
        descripcion,
        entidad: esFinanciera ? actEntidad : undefined,
        estado_fin: esFinanciera ? actEstadoFin : undefined,
      });
      const nuevaActividad = res.data;
      // Subir adjuntos vinculados a esta actividad
      if (adjuntosAct.length > 0) {
        const ok = await subirArchivos(adjuntosAct, nuevaActividad.id);
        if (ok > 0) cargarDocumentos();
      }
      // Si la nota es de financiera, actualizar el estado/recordatorio de esa entidad
      if (esFinanciera) {
        const payload: any = { entidad: actEntidad, estado: actEstadoFin };
        if (actProxSeg) payload.fecha_proximo_seguimiento = actProxSeg;
        if (descAct.trim()) payload.notas = descAct.trim();
        try {
          await apiClient.post(`/leads/${lead.id}/financiamientos`, payload);
          cargarFinanciamientos();
        } catch { /* la nota ya quedó registrada */ }
      }
      setLead((prev) =>
        prev ? { ...prev, actividades: [nuevaActividad, ...(prev.actividades ?? [])] } : prev
      );
      setDescAct("");
      setAdjuntosAct([]);
      setActEntidad("");
      setActEstadoFin("Enviado");
      setActProxSeg("");
      toast.success(esFinanciera ? "Seguimiento de financiera registrado." : "Actividad registrada.");
    } catch {
      toast.error("Error al registrar actividad.");
    } finally {
      setAddingAct(false);
    }
  };

  const handleSolicitarFactura = async () => {
    if (!lead) return;
    setSolicitandoFactura(true);
    try {
      await apiClient.post("/billing/solicitar", { leadId: lead.id });
      setFacturaEnviada(true);
      toast.success("✅ Solicitud enviada al equipo de contabilidad.");
    } catch {
      toast.error("No se pudo enviar la solicitud. Intente de nuevo.");
    } finally {
      setSolicitandoFactura(false);
    }
  };

  if (!lead) return <PageLoader message="Cargando lead..." />;

  const actividades = [...(lead.actividades ?? [])].sort(
    (a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
  );

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Volver</button>
        <div className={styles.topActions}>
          {lead.estado !== "Cerrado" && lead.estado !== "Perdido" && (
            <button
              className={styles.quoteBtn}
              onClick={() =>
                lead.vehiculo_interes
                  ? navigate(`${catalogBase}/${lead.vehiculo_interes.id}/quote?leadId=${lead.id}`)
                  : navigate(`${catalogBase}?leadId=${lead.id}`)
              }
            >
              📄 {lead.vehiculo_interes ? "Crear Cotización" : "Cotizar Vehículo"}
            </button>
          )}
          {/* Botón de facturación: comportamiento diferente por rol */}
          {lead.estado !== "Cerrado" && lead.estado !== "Perdido" && (
            esVendedor ? (
              facturaEnviada ? (
                <div className={styles.facturaEnviadaBadge}>
                  ✅ Enviado a contabilidad
                </div>
              ) : (
                <button
                  className={styles.billBtn}
                  onClick={handleSolicitarFactura}
                  disabled={solicitandoFactura}
                  title="Enviar al equipo de contabilidad para que procesen la factura"
                >
                  {solicitandoFactura ? "Enviando..." : "💼 Enviar a Facturar"}
                </button>
              )
            ) : (
              <button
                className={styles.billBtn}
                onClick={() => navigate(`${billingBase}?cotizacionId=&leadId=${lead.id}`)}
                title="Ir al módulo de facturación"
              >
                💼 Facturar
              </button>
            )
          )}
        </div>
      </div>

      {/* Banner de confirmación cuando vendedor envió solicitud de facturación */}
      {facturaEnviada && (
        <div className={styles.facturaEnviadaBanner}>
          <div className={styles.facturaEnviadaIcon}>✅</div>
          <div className={styles.facturaEnviadaText}>
            <strong>Solicitud enviada a contabilidad</strong>
            <p>El equipo de administración fue notificado y procesará la factura de <strong>{lead.nombre_cliente}</strong> a la brevedad.</p>
          </div>
          <button className={styles.facturaEnviadaClose} onClick={() => setFacturaEnviada(false)}>✕</button>
        </div>
      )}

      {/* Alertas de cumplimiento por etapa */}
      {(() => {
        if (sugef.bajoRetencion) return null;
        const estado = lead.estado;
        // Etapas básicas: falta contacto
        if (estado === "Nuevo" || estado === "Contactado") {
          const faltan = [!lead.cedula_cliente && "cédula", !lead.email_cliente && "correo"].filter(Boolean);
          if (faltan.length === 0) return null;
          return (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
              ℹ️ Completá los datos básicos de contacto (falta: {faltan.join(" y ")}).
            </div>
          );
        }
        // Etapas avanzadas: faltan campos SUGEF
        const avanzadas = ["En Progreso", "Prueba de Manejo", "Cotizacion Enviada", "Negociacion"];
        if (avanzadas.includes(estado) && (sugef.faltantes?.length ?? 0) > 0) {
          return (
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 600 }}>
              ⚠️ Faltan {sugef.faltantes.length} campo(s) de cumplimiento SUGEF para poder facturar. Podés seguir trabajando el lead; completalos en el "Expediente SUGEF".
            </div>
          );
        }
        return null;
      })()}

      <div className={styles.layout}>
        {/* COLUMNA IZQUIERDA — datos del lead */}
        <div className={styles.sidebar}>
          {/* Cabecera */}
          <div className={styles.leadHeader}>
            <div className={styles.avatar}>{lead.nombre_cliente[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editandoNombre ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <input
                    autoFocus
                    value={nombreEdit}
                    onChange={(e) => setNombreEdit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = nombreEdit.trim();
                        if (n && n !== lead.nombre_cliente) save({ nombre_cliente: n } as any);
                        setEditandoNombre(false);
                      }
                      if (e.key === "Escape") setEditandoNombre(false);
                    }}
                    style={{ fontSize: "1.05rem", fontWeight: 700, padding: "0.3rem 0.5rem", borderRadius: 8, border: "1.5px solid #024f7d", width: "100%" }}
                  />
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      onClick={() => {
                        const n = nombreEdit.trim();
                        if (n && n !== lead.nombre_cliente) save({ nombre_cliente: n } as any);
                        setEditandoNombre(false);
                      }}
                      style={{ background: "#024f7d", color: "#fff", border: "none", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoNombre(false)}
                      style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <h1 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>{lead.nombre_cliente}</span>
                  <button
                    onClick={() => { setNombreEdit(lead.nombre_cliente); setEditandoNombre(true); }}
                    title="Editar nombre"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "0.85rem", opacity: 0.6 }}
                  >
                    ✏️
                  </button>
                </h1>
              )}
              <span
                className={styles.estadoBadge}
                style={{ background: ESTADO_COLORS[lead.estado] ?? "#64748b" }}
              >
                {lead.estado}
              </span>

              {/* Temperatura del lead */}
              <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {TEMPERATURAS.map((t) => {
                  const activa = lead.temperatura === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => save({ temperatura: activa ? null : t.value } as any)}
                      title={`Marcar como ${t.value}`}
                      style={{
                        fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                        border: `1.5px solid ${t.color}`, borderRadius: 20, padding: "2px 9px",
                        background: activa ? t.color : "#fff",
                        color: activa ? "#fff" : t.color,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contacto */}
          <SidebarSection id="contacto" title="📋 Contacto" defaultOpen>
            <p><strong>Email:</strong> {lead.email_cliente}</p>
            <p><strong>Teléfono:</strong> {lead.telefono_cliente || "—"}</p>
            <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
              <strong>Cédula:</strong>
              <input
                type="text"
                defaultValue={lead.cedula_cliente ?? ""}
                placeholder="Agregar cédula"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (lead.cedula_cliente ?? "")) save({ cedula_cliente: v } as any);
                }}
                style={{ flex: 1, minWidth: 120, boxSizing: "border-box", padding: "0.3rem 0.5rem", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.88rem", fontFamily: "inherit" }}
              />
            </p>
            <p><strong>Registrado:</strong> {fmtFecha(lead.fecha_creacion)}</p>

            {/* WhatsApp con plantillas precargadas */}
            {normalizarTelCR(lead.telefono_cliente) && (() => {
              const veh = lead.vehiculo_interes
                ? `${lead.vehiculo_interes.marca} ${lead.vehiculo_interes.modelo} ${lead.vehiculo_interes.año}`
                : "el vehículo de su interés";
              const nombre = lead.nombre_cliente.split(" ")[0];
              const plantillas: { label: string; texto: string }[] = [
                { label: "Saludo inicial", texto: `Hola ${nombre}, le saluda Conejo Motors 🐰. Gracias por su interés en ${veh}. ¿Cómo le puedo ayudar?` },
                { label: "Seguimiento", texto: `Hola ${nombre}, ¿sigue interesado en ${veh}? Con gusto le doy más información o agendamos una prueba de manejo.` },
                { label: "Cotización lista", texto: `Hola ${nombre}, ya tengo lista su cotización de ${veh}. ¿Se la envío por aquí?` },
              ];
              return (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    💬 Escribir por WhatsApp
                  </span>
                  {plantillas.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => escribirWhatsApp(p.texto)}
                      title={p.texto}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.4rem", textAlign: "left",
                        background: "#dcfce7", border: "1px solid #16a34a", color: "#15803d",
                        borderRadius: 8, padding: "0.45rem 0.7rem", cursor: "pointer",
                        fontSize: "0.82rem", fontWeight: 600,
                      }}
                    >
                      💬 {p.label}
                    </button>
                  ))}
                </div>
              );
            })()}
            <div className={styles.checkRow}>
              <label>
                <input
                  type="checkbox"
                  checked={lead.contacted_by_email}
                  onChange={() => save({ contacted_by_email: !lead.contacted_by_email })}
                />
                {" "}✉️ Contactado por email
              </label>
            </div>
            <div className={styles.checkRow}>
              <label>
                <input
                  type="checkbox"
                  checked={lead.contacted_by_phone}
                  onChange={() => save({ contacted_by_phone: !lead.contacted_by_phone })}
                />
                {" "}📞 Contactado por teléfono
              </label>
            </div>
            <div className={styles.checkRow}>
              <label>
                <input
                  type="checkbox"
                  checked={lead.contacted_by_whatsapp ?? false}
                  onChange={() => save({ contacted_by_whatsapp: !lead.contacted_by_whatsapp })}
                />
                {" "}💬 Contactado por WhatsApp
              </label>
            </div>
          </SidebarSection>

          {/* Expediente SUGEF / KYC — formulario inteligente */}
          {(() => {
            const kyc = sugef.kyc ?? {};
            const ro = sugef.bajoRetencion;
            const asalariado = kyc.tipo_ingreso === "asalariado";
            const independiente = kyc.tipo_ingreso === "independiente";
            const totalReq = 9 + (asalariado ? 1 : 0);
            const completos = totalReq - (sugef.faltantes?.length ?? totalReq);
            const pct = Math.round((completos / totalReq) * 100);
            const iSt: React.CSSProperties = {
              width: "100%", boxSizing: "border-box", padding: "0.4rem 0.55rem", borderRadius: 6,
              border: "1px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit",
              background: ro ? "#f1f5f9" : "#fff",
            };
            const lleno = (k: string) => { const v = kyc[k]; return v !== null && v !== undefined && v !== ""; };
            const mark = (k: string) => (lleno(k) ? "✅" : "⚠️");
            // Campo de texto/fecha/número reutilizable
            const Campo = (k: string, label: string, tipo: "text" | "date" | "number" = "text") => (
              <label style={{ fontSize: "0.78rem", color: "#334155", display: "flex", flexDirection: "column", gap: 2 }}>
                <span>{mark(k)} {label}</span>
                <input
                  type={tipo} defaultValue={kyc[k] ?? ""} disabled={ro} key={String(kyc[k] ?? "")}
                  onBlur={(e) => {
                    const v = tipo === "number" ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null);
                    if (String(v ?? "") !== String(kyc[k] ?? "")) guardarKyc(k, v);
                  }}
                  style={iSt}
                />
              </label>
            );
            const grupoTitulo = (t: string) => (
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0.5rem 0 0.35rem" }}>{t}</div>
            );
            return (
              <SidebarSection id="sugef" title="📋 Expediente SUGEF" defaultOpen={pct < 100} badge={ro ? "🔒" : `${completos}/${totalReq}`}>
                {ro && sugef.retencion && (
                  <div style={{ background: "#dcfce7", border: "1px solid #16a34a", borderRadius: 8, padding: "0.5rem 0.7rem", fontSize: "0.8rem", color: "#15803d", fontWeight: 600 }}>
                    ✅ Venta facturada — expediente bajo retención hasta {fmtFechaLocal(sugef.retencion.retener_hasta)}. Solo lectura.
                  </div>
                )}
                {/* Barra de progreso */}
                <div style={{ margin: "0.2rem 0 0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: 3 }}>
                    <span>{completos} de {totalReq} campos completados</span>
                    <span style={{ fontWeight: 700, color: pct === 100 ? "#16a34a" : "#f59e0b" }}>{pct}%</span>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#16a34a" : "#f59e0b", transition: "width 0.3s" }} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {grupoTitulo("🪪 Identidad")}
                  {/* Nacionalidad: al elegir Costarricense, autocompleta país de residencia */}
                  <label style={{ fontSize: "0.78rem", color: "#334155", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{mark("nacionalidad")} Nacionalidad</span>
                    <select
                      value={kyc.nacionalidad ?? ""} disabled={ro}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        const obj: any = { nacionalidad: v };
                        if (v === "Costarricense" && !kyc.pais_residencia) obj.pais_residencia = "Costa Rica";
                        guardarKycObj(obj);
                      }}
                      style={iSt}
                    >
                      <option value="">— Seleccioná —</option>
                      {NACIONALIDADES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  {Campo("fecha_nacimiento", "Fecha de nacimiento", "date")}
                  {Campo("lugar_nacimiento", "Lugar de nacimiento")}

                  {grupoTitulo("🏠 Domicilio")}
                  {Campo("direccion", "Dirección exacta")}
                  {Campo("pais_residencia", "País de residencia")}

                  {grupoTitulo("💼 Perfil económico y origen de fondos")}
                  <label style={{ fontSize: "0.78rem", color: "#334155", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{mark("tipo_ingreso")} Tipo de ingreso</span>
                    <select
                      value={kyc.tipo_ingreso ?? ""} disabled={ro}
                      onChange={(e) => guardarKyc("tipo_ingreso", e.target.value || null)}
                      style={iSt}
                    >
                      <option value="">— Seleccioná —</option>
                      <option value="asalariado">Asalariado</option>
                      <option value="independiente">Independiente</option>
                    </select>
                  </label>
                  {asalariado && (
                    <>
                      {Campo("empleador", "Empleador (empresa)")}
                      {Campo("profesion", "Puesto / ocupación")}
                    </>
                  )}
                  {independiente && Campo("profesion", "¿A qué se dedica?")}
                  {kyc.tipo_ingreso && (
                    <div style={{ fontSize: "0.72rem", color: "#16a34a", background: "#f0fdf4", borderRadius: 6, padding: "0.3rem 0.5rem" }}>
                      💵 Origen de fondos: {asalariado ? `Salario${kyc.empleador ? " — " + kyc.empleador : ""}` : `Actividad independiente${kyc.profesion ? ": " + kyc.profesion : ""}`}
                    </div>
                  )}
                  <label style={{ fontSize: "0.78rem", color: "#334155", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{kyc.es_pep === true || kyc.es_pep === false ? "✅" : "⚠️"} ¿Es PEP? (persona expuesta políticamente)</span>
                    <select
                      value={kyc.es_pep === true ? "si" : kyc.es_pep === false ? "no" : ""} disabled={ro}
                      onChange={(e) => guardarKyc("es_pep", e.target.value === "" ? null : e.target.value === "si")}
                      style={iSt}
                    >
                      <option value="">— Sin definir —</option>
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </label>
                  {Campo("monto_estimado_usd", "Monto estimado (USD)", "number")}

                  {grupoTitulo("✍️ Declaración")}
                  {Campo("declaracion_fecha", "Fecha de declaración firmada", "date")}
                </div>
              </SidebarSection>
            );
          })()}

          {/* Vehículo de interés */}
          {lead.vehiculo_interes && (
            <SidebarSection id="vehiculo" title="🚗 Vehículo de Interés" defaultOpen>
              <p className={styles.vehicleTag}>
                {lead.vehiculo_interes.marca} {lead.vehiculo_interes.modelo} ({lead.vehiculo_interes.año})
              </p>
            </SidebarSection>
          )}

          {/* Estado */}
          <SidebarSection id="estado" title="Estado del Lead" defaultOpen>
            <select
              value={lead.estado}
              onChange={(e) => save({ estado: e.target.value } as any)}
              className={styles.select}
              style={{ borderColor: ESTADO_COLORS[lead.estado] ?? "#cbd5e1" }}
            >
              {["Nuevo", "Contactado", "En Progreso", "Cerrado", "Perdido", "Descartado"].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </SidebarSection>

          {/* Fuente */}
          <SidebarSection id="fuente" title="Fuente" defaultOpen={false}>
            <div className={styles.fuenteGrid}>
              {Object.entries(FUENTE_ICONS).map(([f, icon]) => (
                <button
                  key={f}
                  className={`${styles.fuenteBtn} ${lead.fuente === f ? styles.fuenteActive : ""}`}
                  onClick={() => save({ fuente: f } as any)}
                >
                  {icon} {f}
                </button>
              ))}
            </div>
          </SidebarSection>

          {/* Campaña — visible si la fuente es red social */}
          {["Facebook", "Instagram", "TikTok"].includes(lead.fuente) && (
            <SidebarSection id="campana" title="📣 Campaña" defaultOpen={false}>
              <select
                value={lead.campana?.id ?? ""}
                onChange={(e) => save({ campana_id: e.target.value ? Number(e.target.value) : null } as any)}
                style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit" }}
              >
                <option value="">— Orgánico / sin campaña —</option>
                {/* Siempre mostrar la campaña actual aunque esté pausada/finalizada */}
                {lead.campana && !campanasActivas.find(c => c.id === lead.campana!.id) && (
                  <option value={lead.campana.id}>{lead.campana.nombre} (finalizada)</option>
                )}
                {campanasActivas
                  .filter(c => c.plataforma === lead.fuente)
                  .map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)
                }
              </select>
              {lead.campana && (
                <p style={{ fontSize: "0.78rem", color: "#16a34a", margin: "0.4rem 0 0" }}>
                  ✅ Asignado a: <strong>{lead.campana.nombre}</strong>
                </p>
              )}
            </SidebarSection>
          )}

          {/* Última etapa alcanzada */}
          <SidebarSection id="etapa" title="🎯 Última Etapa Alcanzada" defaultOpen>
            <select
              value={lead.ultima_etapa ?? ""}
              onChange={(e) => save({ ultima_etapa: e.target.value || null } as any)}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 0.75rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit" }}
            >
              <option value="">— Sin definir —</option>
              {ETAPAS.map((et) => <option key={et} value={et}>{et}</option>)}
            </select>
          </SidebarSection>

          {/* Seguimiento */}
          <SidebarSection id="seguimiento" title="📅 Próximo Seguimiento" defaultOpen>
            <input
              type="date"
              value={lead.fecha_followup ?? ""}
              onChange={(e) => save({ fecha_followup: e.target.value } as any)}
              className={styles.input}
            />
          </SidebarSection>

          {/* Asignación */}
          {vendedores.length > 0 && (
            <SidebarSection id="vendedor" title="👤 Vendedor Asignado" defaultOpen={false}>
              <select
                value={lead.vendedor_asignado?.id ?? ""}
                onChange={(e) => save({ vendedor_asignado_id: Number(e.target.value) } as any)}
                className={styles.select}
              >
                <option value="">Sin asignar</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre_completo}</option>
                ))}
              </select>
            </SidebarSection>
          )}

          {/* Notas */}
          <SidebarSection id="notas" title="📝 Notas Generales" defaultOpen>
            <textarea
              value={lead.notas ?? ""}
              rows={4}
              placeholder="Observaciones sobre el cliente..."
              className={styles.textarea}
              onChange={(e) => setLead((prev) => prev ? { ...prev, notas: e.target.value } : prev)}
              onBlur={(e) => save({ notas: e.target.value } as any)}
            />
          </SidebarSection>

          {/* ── MODALIDAD DE COMPRA ── */}
          <SidebarSection id="modalidad" title="💳 Modalidad de Compra" defaultOpen={false}>
            <div className={styles.tipoPagoRow}>
              {(["Contado", "Crédito"] as const).map(tipo => (
                <button
                  key={tipo}
                  className={`${styles.tipoPagoBtn} ${lead.tipo_pago === tipo ? styles.tipoPagoActive : ""}`}
                  onClick={() => save({ tipo_pago: tipo } as any)}
                >
                  {tipo === "Contado" ? "💵" : "🏦"} {tipo}
                </button>
              ))}
            </div>
            <label style={{ display: "block", marginTop: "0.6rem", fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
              💰 Prima que puede aportar (₡)
            </label>
            <input
              type="number"
              min={0}
              placeholder="Ej: 3000000"
              defaultValue={lead.prima_disponible != null ? Number(lead.prima_disponible) : ""}
              onBlur={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                if (Number(lead.prima_disponible ?? 0) !== Number(v ?? 0)) save({ prima_disponible: v } as any);
              }}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 0.65rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit" }}
            />
          </SidebarSection>

          {/* Cotizaciones vinculadas */}
          <SidebarSection id="cotizaciones" title="📄 Cotizaciones" defaultOpen badge={cotizaciones.length || undefined}>
            {cotizaciones.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", margin: 0 }}>
                Sin cotizaciones aún.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {cotizaciones.map((c) => {
                  const vencida = new Date(c.fecha_expiracion) < new Date();
                  const estadoColor: Record<string, string> = {
                    Activa: "#10b981", Expirada: "#f59e0b", Cancelada: "#ef4444",
                  };
                  const color = estadoColor[c.estado] ?? "#64748b";
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`${location.pathname.startsWith("/admin") ? "/admin" : "/sales"}/quotes/${c.id}`)}
                      style={{
                        background: "var(--bg, #f8fafc)", border: "1px solid var(--border, #e2e8f0)",
                        borderRadius: 8, padding: "0.6rem 0.8rem", cursor: "pointer",
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <strong style={{ fontSize: "0.85rem" }}>
                          {c.vehiculo.marca} {c.vehiculo.modelo} ({c.vehiculo.año})
                        </strong>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color, background: `${color}18`, padding: "2px 7px", borderRadius: 20 }}>
                          {c.estado}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #64748b)", display: "flex", gap: "0.75rem" }}>
                        <span>#{c.id}</span>
                        <span>{new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(c.total_con_iva)}</span>
                        {c.estado === "Activa" && (
                          <span style={{ color: vencida ? "#ef4444" : "#f59e0b" }}>
                            {vencida ? "⚠️ Vencida" : `Vence ${fmtFechaLocal(c.fecha_expiracion)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SidebarSection>

          {/* Documentos del cliente */}
          <SidebarSection id="documentos" title="📎 Documentos del Cliente" defaultOpen badge={documentos.length || undefined}>
            <p style={{ fontSize: "0.76rem", color: "#64748b", margin: "0 0 0.6rem" }}>
              Cédula, estados de cuenta, CIC, etc. Se eliminan automáticamente a los 2 meses por seguridad.
            </p>

            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                border: "1.5px dashed #94a3b8", borderRadius: 8, padding: "0.6rem",
                cursor: subiendoDoc ? "wait" : "pointer", fontSize: "0.85rem", fontWeight: 600,
                color: "#475569", background: "#f8fafc",
              }}
            >
              {subiendoDoc ? "Subiendo…" : "⬆️ Subir documento(s)"}
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
                onChange={handleSubirDoc}
                disabled={subiendoDoc}
                style={{ display: "none" }}
              />
            </label>

            {documentos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.7rem" }}>
                {documentos.map((d) => {
                  const dias = Math.ceil((new Date(d.fecha_expiracion).getTime() - Date.now()) / 86400000);
                  const porVencer = dias <= 7;
                  return (
                    <div
                      key={d.id}
                      style={{
                        background: "#f8fafc", border: "1px solid #e2e8f0",
                        borderRadius: 8, padding: "0.55rem 0.7rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ flex: 1, fontSize: "0.84rem", fontWeight: 600, wordBreak: "break-word" }}>
                          {d.tipo_mime?.includes("pdf") ? "📄" : d.tipo_mime?.includes("image") ? "🖼️" : "📎"} {d.nombre}
                        </span>
                        <button
                          onClick={() => handleDescargarDoc(d)}
                          disabled={descargandoId === d.id}
                          title="Descargar"
                          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1rem" }}
                        >
                          {descargandoId === d.id ? "⏳" : "⬇️"}
                        </button>
                        <button
                          onClick={() => handleEliminarDoc(d)}
                          title="Eliminar"
                          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "0.9rem", color: "#ef4444" }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: 4 }}>
                        <select
                          defaultValue={d.tipo ?? "otro"}
                          disabled={sugef.bajoRetencion}
                          onChange={(e) => {
                            if (!lead) return;
                            apiClient.patch(`/leads/${lead.id}/documentos/${d.id}/tipo`, { tipo: e.target.value })
                              .then(() => cargarDocumentos())
                              .catch(() => toast.error("No se pudo cambiar el tipo."));
                          }}
                          style={{ fontSize: "0.72rem", padding: "0.2rem 0.35rem", borderRadius: 6, border: "1px solid #e2e8f0", fontFamily: "inherit" }}
                        >
                          {TIPOS_DOC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <span style={{ fontSize: "0.7rem", color: sugef.bajoRetencion ? "#16a34a" : (porVencer ? "#dc2626" : "#94a3b8") }}>
                          {(d.tamano_bytes / 1024).toFixed(0)} KB ·{" "}
                          {sugef.bajoRetencion
                            ? "🔒 en retención"
                            : dias > 0 ? `se elimina en ${dias}d` : "se eliminará hoy"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SidebarSection>

          {saving && <p className={styles.savingHint}>Guardando...</p>}
        </div>

        {/* COLUMNA DERECHA — timeline de actividades */}
        <div className={styles.main}>
          {/* Resumen del Lead — datos y avance */}
          {(() => {
            const FUNNEL = ["Nuevo", "Contactado", "En Progreso", "Cerrado"];
            const perdido = lead.estado === "Perdido";
            const idxActual = FUNNEL.indexOf(lead.estado);
            const dias = Math.floor((Date.now() - new Date(lead.fecha_creacion).getTime()) / 86400000);
            const ultimaAct = actividades[0]?.fecha_creacion;
            const cotsActivas = cotizaciones.filter((c) => c.estado === "Activa");
            const totalCots = cotsActivas.reduce((s, c) => s + Number(c.total_con_iva || 0), 0);
            const finAprob = financiamientos.filter((f) => f.estado === "Aprobado").length;
            const finProceso = financiamientos.filter((f) => ["Enviado", "En Revisión", "Pre-Aprobado"].includes(f.estado)).length;
            const dato = (icon: string, label: string, value: string) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 90 }}>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>{icon} {label}</span>
                <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0a2540" }}>{value}</span>
              </div>
            );
            return (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.15rem", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.8rem" }}>
                  📊 Resumen del Lead
                </div>

                {/* Stepper de avance */}
                {perdido ? (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.5rem 0.8rem", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.9rem" }}>
                    ❌ Lead Perdido
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                    {FUNNEL.map((etapa, i) => {
                      const done = idxActual >= 0 && i <= idxActual;
                      const actual = i === idxActual;
                      return (
                        <div key={etapa} style={{ display: "flex", alignItems: "center", flex: i < FUNNEL.length - 1 ? 1 : "0 0 auto" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.7rem", fontWeight: 700,
                              background: done ? (ESTADO_COLORS[lead.estado] ?? "#10b981") : "#e2e8f0",
                              color: done ? "#fff" : "#94a3b8",
                              boxShadow: actual ? `0 0 0 3px ${(ESTADO_COLORS[lead.estado] ?? "#10b981")}33` : "none",
                            }}>
                              {done ? "✓" : i + 1}
                            </div>
                            <span style={{ fontSize: "0.68rem", color: actual ? "#0a2540" : "#94a3b8", fontWeight: actual ? 700 : 500, whiteSpace: "nowrap" }}>{etapa}</span>
                          </div>
                          {i < FUNNEL.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: i < idxActual ? (ESTADO_COLORS[lead.estado] ?? "#10b981") : "#e2e8f0", margin: "0 4px", marginBottom: 16 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Datos recopilados */}
                <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                  {dato("📅", "En sistema", `${dias} día${dias === 1 ? "" : "s"}`)}
                  {dato("🕐", "Últ. actividad", ultimaAct ? fmtFechaLocal(ultimaAct) : "—")}
                  {dato("💳", "Modalidad", lead.tipo_pago ?? "Sin definir")}
                  {lead.temperatura && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 90 }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>🌡️ Temperatura</span>
                      <span style={{ fontSize: "0.92rem", fontWeight: 700, color: TEMP_COLOR[lead.temperatura] ?? "#0a2540" }}>
                        {TEMPERATURAS.find((t) => t.value === lead.temperatura)?.label ?? lead.temperatura}
                      </span>
                    </div>
                  )}
                  {lead.ultima_etapa && dato("🎯", "Última etapa", lead.ultima_etapa)}
                  {Number(lead.prima_disponible) > 0 && dato("💰", "Prima disponible", new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(lead.prima_disponible)))}
                  {dato("🚗", "Vehículo", lead.vehiculo_interes ? `${lead.vehiculo_interes.marca} ${lead.vehiculo_interes.modelo}` : "—")}
                  {dato("📄", "Cotizaciones", cotsActivas.length > 0 ? `${cotsActivas.length} · ${new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(totalCots)}` : String(cotizaciones.length))}
                  {dato("📎", "Documentos", String(documentos.length))}
                  {lead.tipo_pago === "Crédito" && dato("🏦", "Financieras", `${finProceso} en proceso · ${finAprob} aprob.`)}
                </div>
              </div>
            );
          })()}

          {/* Resumen de financieras (feedback rápido + recordatorios) */}
          {financiamientos.length > 0 && (() => {
            const activos = financiamientos.filter((f) => ENTIDADES.includes(f.entidad));
            const seguimientos = activos
              .filter((f) => f.fecha_proximo_seguimiento && !["Aprobado", "Rechazado", "Desistió"].includes(f.estado))
              .sort((a, b) => (a.fecha_proximo_seguimiento! < b.fecha_proximo_seguimiento! ? -1 : 1));
            return (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
                  🏦 Estado de Financieras
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {activos.map((f) => {
                    const color = ESTADO_FIN_COLORS[f.estado] ?? "#64748b";
                    return (
                      <span key={f.entidad} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: "0.25rem 0.7rem", fontSize: "0.82rem" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
                        <strong>{f.entidad}</strong>
                        <span style={{ color }}>{f.estado}</span>
                      </span>
                    );
                  })}
                </div>
                {seguimientos.length > 0 && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "0.5rem 0.8rem", marginTop: "0.7rem", fontSize: "0.83rem" }}>
                    <strong style={{ color: "#92400e" }}>📞 Próximos contactos:</strong>{" "}
                    {seguimientos.map((s, i) => {
                      const vencido = new Date(s.fecha_proximo_seguimiento!) < new Date(new Date().toDateString());
                      return (
                        <span key={s.entidad} style={{ color: vencido ? "#dc2626" : "#92400e", fontWeight: vencido ? 700 : 400 }}>
                          {i > 0 && " · "}
                          {s.entidad} ({fmtFechaLocal(s.fecha_proximo_seguimiento!)}{vencido ? " ⚠️" : ""})
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <h2>Historial de Actividades</h2>

          {/* Formulario nueva actividad */}
          <div className={styles.addActivity}>
            <div className={styles.addRow}>
              <select
                value={actEntidad ? "financiera" : tipoAct}
                onChange={(e) => {
                  if (e.target.value !== "financiera") { setTipoAct(e.target.value); setActEntidad(""); }
                }}
                className={styles.select}
                disabled={!!actEntidad}
              >
                {TIPOS_MANUALES.map((t) => (
                  <option key={t} value={t}>{TIPO_ICONS[t]} {t.replace("_", " ")}</option>
                ))}
                {actEntidad && <option value="financiera">🏦 financiera</option>}
              </select>
            </div>
            <textarea
              value={descAct}
              rows={3}
              placeholder={actEntidad
                ? `¿En qué quedó con ${actEntidad}? (requisitos, respuesta, etc.)`
                : "Describe la actividad (ej: Llamé al cliente, comentó que revisa financiamiento...)"}
              className={styles.textarea}
              onChange={(e) => setDescAct(e.target.value)}
            />

            {/* Vincular la nota a una financiera */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.6rem 0.75rem", margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>🏦 Financiera:</span>
                <select
                  value={actEntidad}
                  onChange={(e) => setActEntidad(e.target.value)}
                  style={{ flex: 1, minWidth: 140, padding: "0.4rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit" }}
                >
                  <option value="">— Ninguna (nota normal) —</option>
                  {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {actEntidad && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    value={actEstadoFin}
                    onChange={(e) => setActEstadoFin(e.target.value)}
                    style={{ flex: 1, minWidth: 130, padding: "0.4rem 0.6rem", borderRadius: 8, border: `1.5px solid ${ESTADO_FIN_COLORS[actEstadoFin] ?? "#e2e8f0"}`, fontSize: "0.85rem", fontFamily: "inherit", fontWeight: 600 }}
                  >
                    {ESTADOS_FIN.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <label style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    📞 Próximo contacto:
                    <input
                      type="date"
                      value={actProxSeg}
                      onChange={(e) => setActProxSeg(e.target.value)}
                      style={{ padding: "0.35rem 0.5rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.82rem", fontFamily: "inherit" }}
                    />
                  </label>
                </div>
              )}

              {/* Documentos de la entidad seleccionada: descargar o enviar por WhatsApp */}
              {actEntidad && (() => {
                const ent = entidadesFin.find((e) => e.nombre === actEntidad);
                if (!ent || !ent.documentos?.length) return null;
                const nombreCliente = lead.nombre_cliente.split(" ")[0];
                return (
                  <div style={{ marginTop: "0.5rem", borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                      📎 Formularios de {actEntidad}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.4rem" }}>
                      {ent.documentos.map((d) => (
                        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.4rem 0.6rem" }}>
                          <span style={{ flex: 1, fontSize: "0.82rem", minWidth: 120 }}>📄 {d.nombre}</span>
                          <a
                            href={d.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: "0.78rem", fontWeight: 600, color: "#024f7d", textDecoration: "none", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0.25rem 0.6rem" }}
                          >
                            ⬇️ Descargar
                          </a>
                          <button
                            type="button"
                            onClick={() => escribirWhatsApp(`Hola ${nombreCliente}, para avanzar con su crédito en ${actEntidad}, por favor complete este formulario (${d.nombre}): ${d.url}`)}
                            style={{ fontSize: "0.78rem", fontWeight: 600, color: "#15803d", background: "#dcfce7", border: "1px solid #16a34a", borderRadius: 6, padding: "0.25rem 0.6rem", cursor: "pointer" }}
                          >
                            💬 Enviar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Adjuntos de la actividad */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", margin: "0.4rem 0" }}>
              <label
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  border: "1px solid #cbd5e1", borderRadius: 8, padding: "0.35rem 0.7rem",
                  cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc",
                }}
              >
                📎 Adjuntar documento(s)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    setAdjuntosAct(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>
              {adjuntosAct.map((f, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    background: "#e0f2fe", color: "#075985", borderRadius: 6,
                    padding: "0.2rem 0.5rem", fontSize: "0.76rem",
                  }}
                >
                  📄 {f.name}
                  <button
                    type="button"
                    onClick={() => setAdjuntosAct((prev) => prev.filter((_, j) => j !== i))}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#0369a1", fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <button
              className={styles.addBtn}
              onClick={handleAddActividad}
              disabled={addingAct || (!descAct.trim() && adjuntosAct.length === 0 && !actEntidad)}
            >
              {addingAct ? "Registrando..." : actEntidad ? "🏦 Registrar seguimiento" : "➕ Registrar actividad"}
            </button>
          </div>

          {/* Timeline */}
          <div className={styles.timeline}>
            {actividades.length === 0 ? (
              <p className={styles.emptyTimeline}>No hay actividades registradas aún.</p>
            ) : (
              actividades.map((act) => (
                <div key={act.id} className={styles.timelineItem}>
                  <div className={styles.timelineIcon}>
                    {TIPO_ICONS[act.tipo] ?? "📋"}
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTipo}>{act.tipo.replace("_", " ")}</span>
                      <span className={styles.timelineFecha}>
                        {new Date(act.fecha_creacion).toLocaleString("es-CR", {
                          timeZone: "America/Costa_Rica",
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {act.entidad && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: "0.1rem 0 0.35rem", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.76rem", fontWeight: 700 }}>
                          🏦 {act.entidad}
                        </span>
                        {act.estado_fin && (
                          <span style={{ background: ESTADO_FIN_COLORS[act.estado_fin] ?? "#64748b", color: "#fff", borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.74rem", fontWeight: 700 }}>
                            {act.estado_fin}
                          </span>
                        )}
                      </div>
                    )}
                    <p className={styles.timelineDesc}>{act.descripcion}</p>
                    {/* Documentos adjuntos a esta actividad */}
                    {(() => {
                      const adjuntos = documentos.filter((d) => d.actividad_id === act.id);
                      if (adjuntos.length === 0) return null;
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.4rem 0" }}>
                          {adjuntos.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => handleDescargarDoc(d)}
                              disabled={descargandoId === d.id}
                              title="Descargar"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6,
                                padding: "0.25rem 0.55rem", fontSize: "0.78rem", cursor: "pointer", color: "#334155",
                              }}
                            >
                              {descargandoId === d.id ? "⏳" : (d.tipo_mime?.includes("pdf") ? "📄" : d.tipo_mime?.includes("image") ? "🖼️" : "📎")} {d.nombre}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {act.usuario && (
                      <span className={styles.timelineUser}>— {act.usuario.nombre_completo}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

/** Sección colapsable del panel izquierdo. Recuerda su estado en localStorage. */
const SidebarSection = ({
  id, title, defaultOpen = true, badge, children,
}: {
  id: string;
  title: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) => {
  const storeKey = `leadSec:${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storeKey);
      return v === null ? defaultOpen : v === "1";
    } catch { return defaultOpen; }
  });
  const toggle = () =>
    setOpen((o) => {
      try { localStorage.setItem(storeKey, o ? "0" : "1"); } catch { /* noop */ }
      return !o;
    });
  return (
    <div className={styles.card}>
      <button type="button" className={styles.sectionHeader} onClick={toggle} aria-expanded={open}>
        <span className={styles.sectionTitle}>{title}</span>
        {badge != null && <span className={styles.sectionBadge}>{badge}</span>}
        <span className={styles.chevron} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>▾</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
};

