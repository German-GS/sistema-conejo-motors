// frontend/src/pages/admin/sales/LeadDetailsPage.tsx
import { useState, useEffect } from "react";
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
  usuario?: { nombre_completo: string };
}

interface Vendedor {
  id: number;
  nombre_completo: string;
}

interface LeadDetails {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string;
  estado: string;
  fuente: string;
  notas?: string;
  fecha_followup?: string;
  contacted_by_email: boolean;
  contacted_by_phone: boolean;
  fecha_creacion: string;
  vehiculo_interes?: { id: number; marca: string; modelo: string; año: number };
  vendedor_asignado?: Vendedor;
  actividades?: Actividad[];
}

const FUENTE_ICONS: Record<string, string> = {
  Web: "🌐", Instagram: "📸", Facebook: "👍", WhatsApp: "💬",
  TikTok: "🎵", Referido: "🤝", Presencial: "🏢", Otro: "📋",
};

const TIPO_ICONS: Record<string, string> = {
  nota: "📝", llamada: "📞", email: "📧", whatsapp: "💬",
  reunion: "🤝", estado_cambio: "🔄", cotizacion_creada: "📄",
};

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: "#3b82f6", Contactado: "#f59e0b", "En Progreso": "#8b5cf6",
  Cerrado: "#10b981", Perdido: "#ef4444",
};

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
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!leadId) return;
    apiClient.get(`/leads/${leadId}`)
      .then((res) => setLead(res.data))
      .catch(() => toast.error("No se pudo cargar el lead."));
    apiClient.get("/users")
      .then((res) => setVendedores(res.data.filter((u: any) => u.rol?.nombre === "Vendedor" || u.rol?.nombre === "Administrador")))
      .catch(() => {});
  }, [leadId]);

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

  const handleAddActividad = async () => {
    if (!lead || !descAct.trim()) return;
    setAddingAct(true);
    try {
      const res = await apiClient.post(`/leads/${lead.id}/actividades`, {
        tipo: tipoAct,
        descripcion: descAct,
      });
      setLead((prev) =>
        prev ? { ...prev, actividades: [res.data, ...(prev.actividades ?? [])] } : prev
      );
      setDescAct("");
      toast.success("Actividad registrada.");
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

  const actividades = lead.actividades ?? [];

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Volver</button>
        <div className={styles.topActions}>
          {lead.vehiculo_interes && lead.estado !== "Cerrado" && lead.estado !== "Perdido" && (
            <button
              className={styles.quoteBtn}
              onClick={() => navigate(`${catalogBase}/${lead.vehiculo_interes!.id}/quote?leadId=${lead.id}`)}
            >
              📄 Crear Cotización
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

      <div className={styles.layout}>
        {/* COLUMNA IZQUIERDA — datos del lead */}
        <div className={styles.sidebar}>
          {/* Cabecera */}
          <div className={styles.leadHeader}>
            <div className={styles.avatar}>{lead.nombre_cliente[0].toUpperCase()}</div>
            <div>
              <h1>{lead.nombre_cliente}</h1>
              <span
                className={styles.estadoBadge}
                style={{ background: ESTADO_COLORS[lead.estado] ?? "#64748b" }}
              >
                {lead.estado}
              </span>
            </div>
          </div>

          {/* Contacto */}
          <div className={styles.card}>
            <h4>📋 Contacto</h4>
            <p><strong>Email:</strong> {lead.email_cliente}</p>
            <p><strong>Teléfono:</strong> {lead.telefono_cliente || "—"}</p>
            <p><strong>Registrado:</strong> {fmtFecha(lead.fecha_creacion)}</p>
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
          </div>

          {/* Vehículo de interés */}
          {lead.vehiculo_interes && (
            <div className={styles.card}>
              <h4>🚗 Vehículo de Interés</h4>
              <p className={styles.vehicleTag}>
                {lead.vehiculo_interes.marca} {lead.vehiculo_interes.modelo} ({lead.vehiculo_interes.año})
              </p>
            </div>
          )}

          {/* Estado */}
          <div className={styles.card}>
            <h4>Estado del Lead</h4>
            <select
              value={lead.estado}
              onChange={(e) => save({ estado: e.target.value } as any)}
              className={styles.select}
              style={{ borderColor: ESTADO_COLORS[lead.estado] ?? "#cbd5e1" }}
            >
              {["Nuevo", "Contactado", "En Progreso", "Cerrado", "Perdido"].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Fuente */}
          <div className={styles.card}>
            <h4>Fuente</h4>
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
          </div>

          {/* Seguimiento */}
          <div className={styles.card}>
            <h4>📅 Próximo Seguimiento</h4>
            <input
              type="date"
              value={lead.fecha_followup ?? ""}
              onChange={(e) => save({ fecha_followup: e.target.value } as any)}
              className={styles.input}
            />
          </div>

          {/* Asignación */}
          {vendedores.length > 0 && (
            <div className={styles.card}>
              <h4>👤 Vendedor Asignado</h4>
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
            </div>
          )}

          {/* Notas */}
          <div className={styles.card}>
            <h4>📝 Notas Generales</h4>
            <textarea
              value={lead.notas ?? ""}
              rows={4}
              placeholder="Observaciones sobre el cliente..."
              className={styles.textarea}
              onChange={(e) => setLead((prev) => prev ? { ...prev, notas: e.target.value } : prev)}
              onBlur={(e) => save({ notas: e.target.value } as any)}
            />
          </div>

          {saving && <p className={styles.savingHint}>Guardando...</p>}
        </div>

        {/* COLUMNA DERECHA — timeline de actividades */}
        <div className={styles.main}>
          <h2>Historial de Actividades</h2>

          {/* Formulario nueva actividad */}
          <div className={styles.addActivity}>
            <div className={styles.addRow}>
              <select
                value={tipoAct}
                onChange={(e) => setTipoAct(e.target.value)}
                className={styles.select}
              >
                {Object.entries(TIPO_ICONS).map(([t, icon]) => (
                  <option key={t} value={t}>{icon} {t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <textarea
              value={descAct}
              rows={3}
              placeholder="Describe la actividad (ej: Llamé al cliente, comentó que revisa financiamiento...)"
              className={styles.textarea}
              onChange={(e) => setDescAct(e.target.value)}
            />
            <button
              className={styles.addBtn}
              onClick={handleAddActividad}
              disabled={addingAct || !descAct.trim()}
            >
              {addingAct ? "Registrando..." : "➕ Registrar actividad"}
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
                    <p className={styles.timelineDesc}>{act.descripcion}</p>
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
