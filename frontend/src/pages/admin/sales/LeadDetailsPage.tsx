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
}

interface LeadDetails {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string;
  whatsapp_cliente?: string;
  estado: string;
  fuente: string;
  notas?: string;
  fecha_followup?: string;
  contacted_by_email: boolean;
  contacted_by_phone: boolean;
  contacted_by_whatsapp: boolean;
  tipo_pago?: 'Contado' | 'Crédito';
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

  // Financiamiento
  const [financiamientos, setFinanciamientos] = useState<Financiamiento[]>([]);
  const [editingFin, setEditingFin] = useState<Record<string, Financiamiento>>({});
  const [savingFin, setSavingFin] = useState<Record<string, boolean>>({});

  const ENTIDADES = ["Banco Promerica", "Davivienda", "Lafise", "BAC", "Coopenae"];
  const ESTADOS_FIN = ["Pendiente", "Enviado", "En Revisión", "Pre-Aprobado", "Aprobado", "Rechazado"];
  const ESTADO_FIN_COLORS: Record<string, string> = {
    "Pendiente": "#94a3b8", "Enviado": "#3b82f6", "En Revisión": "#f59e0b",
    "Pre-Aprobado": "#8b5cf6", "Aprobado": "#10b981", "Rechazado": "#ef4444",
  };

  const getFinData = (entidad: string): Financiamiento =>
    editingFin[entidad] ?? financiamientos.find(f => f.entidad === entidad) ?? { entidad, estado: "Pendiente" };

  const handleFinChange = (entidad: string, field: keyof Financiamiento, value: any) => {
    setEditingFin(prev => ({
      ...prev,
      [entidad]: { ...getFinData(entidad), [field]: value },
    }));
  };

  const handleSaveFin = async (entidad: string) => {
    if (!lead) return;
    const data = editingFin[entidad] ?? getFinData(entidad);
    setSavingFin(prev => ({ ...prev, [entidad]: true }));
    try {
      const res = await apiClient.post(`/leads/${lead.id}/financiamientos`, { ...data, entidad });
      setFinanciamientos(prev => {
        const idx = prev.findIndex(f => f.entidad === entidad);
        if (idx >= 0) { const n = [...prev]; n[idx] = res.data; return n; }
        return [...prev, res.data];
      });
      setEditingFin(prev => { const n = { ...prev }; delete n[entidad]; return n; });
      toast.success(`${entidad}: guardado.`);
    } catch { toast.error("Error al guardar."); }
    finally { setSavingFin(prev => ({ ...prev, [entidad]: false })); }
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

          {/* ── MODALIDAD DE COMPRA ── */}
          <div className={styles.card}>
            <h4>💳 Modalidad de Compra</h4>
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

      {/* ── PANEL FINANCIAMIENTO (solo si es Crédito) ── */}
      {lead.tipo_pago === "Crédito" && (
        <div className={styles.finPanel}>
          <h2 className={styles.finTitle}>🏦 Gestión de Financiamiento</h2>
          <p className={styles.finSubtitle}>
            Registra el estado de la solicitud con cada entidad bancaria.
          </p>
          <div className={styles.finGrid}>
            {ENTIDADES.map(entidad => {
              const fin = getFinData(entidad);
              const isEditing = !!editingFin[entidad];
              const isSaving = savingFin[entidad];
              const estadoColor = ESTADO_FIN_COLORS[fin.estado] ?? "#94a3b8";

              return (
                <div key={entidad} className={`${styles.finCard} ${fin.estado === "Aprobado" ? styles.finCardAprobado : fin.estado === "Rechazado" ? styles.finCardRechazado : ""}`}>
                  <div className={styles.finCardHeader}>
                    <span className={styles.finEntidad}>🏛 {entidad}</span>
                    <span className={styles.finEstadoBadge} style={{ background: estadoColor }}>
                      {fin.estado}
                    </span>
                  </div>

                  <div className={styles.finFields}>
                    <div className={styles.finField}>
                      <label>Estado</label>
                      <select
                        value={fin.estado}
                        onChange={e => handleFinChange(entidad, "estado", e.target.value)}
                        className={styles.finSelect}
                      >
                        {ESTADOS_FIN.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className={styles.finField}>
                      <label>Monto Solicitado (₡)</label>
                      <input type="number" placeholder="0" className={styles.finInput}
                        value={fin.monto_solicitado ?? ""}
                        onChange={e => handleFinChange(entidad, "monto_solicitado", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className={styles.finField}>
                      <label>Monto Aprobado (₡)</label>
                      <input type="number" placeholder="0" className={styles.finInput}
                        value={fin.monto_aprobado ?? ""}
                        onChange={e => handleFinChange(entidad, "monto_aprobado", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className={styles.finField}>
                      <label>Plazo (meses)</label>
                      <input type="number" placeholder="60" className={styles.finInput}
                        value={fin.plazo_meses ?? ""}
                        onChange={e => handleFinChange(entidad, "plazo_meses", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className={styles.finField}>
                      <label>Tasa Anual (%)</label>
                      <input type="number" step="0.1" placeholder="12" className={styles.finInput}
                        value={fin.tasa_anual ?? ""}
                        onChange={e => handleFinChange(entidad, "tasa_anual", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                    <div className={styles.finField}>
                      <label>Fecha Envío</label>
                      <input type="date" className={styles.finInput}
                        value={fin.fecha_envio ?? ""}
                        onChange={e => handleFinChange(entidad, "fecha_envio", e.target.value)}
                      />
                    </div>
                    <div className={styles.finField}>
                      <label>Fecha Respuesta</label>
                      <input type="date" className={styles.finInput}
                        value={fin.fecha_respuesta ?? ""}
                        onChange={e => handleFinChange(entidad, "fecha_respuesta", e.target.value)}
                      />
                    </div>
                    <div className={`${styles.finField} ${styles.finFieldFull}`}>
                      <label>Notas</label>
                      <textarea rows={2} placeholder="Observaciones, requisitos, contacto..." className={styles.finTextarea}
                        value={fin.notas ?? ""}
                        onChange={e => handleFinChange(entidad, "notas", e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    className={styles.finSaveBtn}
                    onClick={() => handleSaveFin(entidad)}
                    disabled={isSaving || !isEditing}
                  >
                    {isSaving ? "Guardando..." : "💾 Guardar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

