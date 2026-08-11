// frontend/src/pages/admin/sales/LeadsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { LeadsKanban } from "@/components/LeadsKanban";
import styles from "./LeadsPage.module.css";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";
import { LuChartColumnStacked, LuLock, LuTriangleAlert, LuCalendarDays, LuPlus, LuX, LuList, LuLayoutGrid, LuMegaphone } from "react-icons/lu";

interface Lead {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string;
  estado: string;
  fuente: string;
  temperatura?: string | null;
  fecha_followup?: string;
  fecha_creacion: string;
  vehiculo_interes?: { marca: string; modelo: string };
  vendedor_asignado?: { nombre_completo: string };
}

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: "#3b82f6", Contactado: "var(--warning)", "En Progreso": "#8b5cf6",
  Cerrado: "#10b981", Perdido: "#ef4444", Descartado: "var(--slate-400)",
};

const TEMP_COLOR: Record<string, string> = { Caliente: "#ef4444", Tibio: "var(--warning)", Frio: "#3b82f6" };

const FUENTE_ICONS: Record<string, string> = {
  Web: "🌐", Instagram: "📸", Facebook: "👍", WhatsApp: "💬",
  TikTok: "🎵", Referido: "🤝", Presencial: "🏢", Llamada: "📞", Otro: "📋",
};
const FUENTES = ["Facebook", "Instagram", "TikTok", "WhatsApp", "Web", "Referido", "Llamada", "Presencial", "Otro"];

export const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [vista, setVista] = useState<"lista" | "tablero">("lista");
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", telefono: "", email: "", fuente: "", campana_id: "" });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [campanasActivas, setCampanasActivas] = useState<{ id: number; nombre: string; plataforma: string }[]>([]);
  const [reporteFuentes, setReporteFuentes] = useState<any[]>([]);
  const [showReporte, setShowReporte] = useState(false);
  const [sugefEstados, setSugefEstados] = useState<Record<number, string>>({});

  const toggleReporte = () => {
    if (!showReporte && reporteFuentes.length === 0) {
      apiClient.get("/leads/reporte-fuentes").then((r) => setReporteFuentes(r.data)).catch(() => {});
    }
    setShowReporte((v) => !v);
  };
  const location = useLocation();
  const confirm = useConfirm();
  const isAdmin = location.pathname.startsWith("/admin");

  // Base path para el detalle del lead
  const basePath = isAdmin ? "/admin" : "/sales";
  // Admin ve todos los leads, vendedor solo los suyos
  const endpoint = isAdmin ? "/leads" : "/leads/my-leads";

  const loadLeads = () => {
    setLoading(true);
    apiClient.get(endpoint)
      .then((res) => setLeads(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLeads(); }, [endpoint]);

  useEffect(() => {
    apiClient.get("/sugef/estados")
      .then((r) => setSugefEstados(r.data ?? {}))
      .catch(() => {});
    apiClient.get("/campanas/activas")
      .then((r) => setCampanasActivas(r.data))
      .catch(() => {});
    // Migración silenciosa: vincula vehículo de cotizaciones a leads que no lo tienen
    if (isAdmin) {
      apiClient.post("/leads/fix-vehiculos").catch(() => {});
    }
  }, [isAdmin]);

  const handleEliminar = async (id: number, nombre: string) => {
    const ok = await confirm({
      title: "Eliminar lead",
      message: `¿Eliminar lead de "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/leads/${id}`);
      toast.success(`Lead eliminado.`);
      loadLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al eliminar.");
    }
  };

  // Mover lead a otro estado (drag&drop del tablero) — optimista
  const moverLead = async (id: number, nuevoEstado: string) => {
    const anterior = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, estado: nuevoEstado } : l)));
    try {
      await apiClient.patch(`/leads/${id}`, { estado: nuevoEstado });
      toast.success(`Lead movido a "${nuevoEstado}".`);
    } catch {
      setLeads(anterior);
      toast.error("No se pudo cambiar el estado.");
    }
  };

  const crearLead = async () => {
    if (!nuevo.nombre.trim()) return toast.error("El nombre es requerido.");
    if (!nuevo.fuente) return toast.error("Seleccioná la fuente del lead.");
    if (!nuevo.email.trim() && !nuevo.telefono.trim()) return toast.error("Indique email o teléfono.");
    setGuardandoNuevo(true);
    try {
      await apiClient.post("/leads/manual", {
        ...nuevo,
        campana_id: nuevo.campana_id ? Number(nuevo.campana_id) : undefined,
      });
      toast.success("Lead creado.");
      setShowNuevo(false);
      setNuevo({ nombre: "", telefono: "", email: "", fuente: "", campana_id: "" });
      loadLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al crear el lead.");
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const filtered = filterEstado === "Todos"
    ? leads
    : leads.filter((l) => l.estado === filterEstado);

  const countByEstado = leads.reduce((acc, l) => {
    acc[l.estado] = (acc[l.estado] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Métricas CRM (solo admin)
  const metrics = useMemo(() => {
    if (!isAdmin || !leads.length) return null;
    const total = leads.length;
    const cerrados = countByEstado["Cerrado"] ?? 0;
    const tasaConversion = total > 0 ? ((cerrados / total) * 100).toFixed(1) : "0";
    const hoy = new Date();
    const vencidos = leads.filter(l => {
      const f = l.fecha_followup ? new Date(l.fecha_followup) : null;
      return f && f < hoy && l.estado !== "Cerrado" && l.estado !== "Perdido";
    }).length;

    // Por fuente
    const porFuente = leads.reduce((acc, l) => {
      const f = l.fuente || "Otro";
      acc[f] = (acc[f] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topFuente = Object.entries(porFuente).sort((a, b) => b[1] - a[1])[0];

    return { total, cerrados, tasaConversion, vencidos, topFuente, porFuente };
  }, [leads, isAdmin, countByEstado]);

  return (
    <div>
      {/* Panel de métricas CRM (solo admin) */}
      {isAdmin && metrics && (
        <div className={styles.metricsPanel}>
          <div className={styles.metricCard}>
            <span className={styles.metricNum}>{metrics.total}</span>
            <span className={styles.metricLabel}>Total Leads</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricNum} style={{ color: "#10b981" }}>{metrics.tasaConversion}%</span>
            <span className={styles.metricLabel}>Tasa de Conversión</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricNum} style={{ color: "#10b981" }}>{metrics.cerrados}</span>
            <span className={styles.metricLabel}>Cerrados / Vendidos</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricNum} style={{ color: metrics.vencidos > 0 ? "#ef4444" : "#10b981" }}>
              {metrics.vencidos}
            </span>
            <span className={styles.metricLabel}>Follow-ups Vencidos</span>
          </div>
          {metrics.topFuente && (
            <div className={styles.metricCard}>
              <span className={styles.metricNum} style={{ fontSize: "1.1rem" }}>
                {FUENTE_ICONS[metrics.topFuente[0]] ?? "📋"} {metrics.topFuente[0]}
              </span>
              <span className={styles.metricLabel}>Fuente principal ({metrics.topFuente[1]} leads)</span>
            </div>
          )}
          {/* Barras por fuente */}
          <div className={`${styles.metricCard} ${styles.metricFuentes}`}>
            <span className={styles.metricLabel} style={{ marginBottom: "0.5rem" }}>Leads por Fuente</span>
            {Object.entries(metrics.porFuente)
              .sort((a, b) => b[1] - a[1])
              .map(([fuente, count]) => (
                <div key={fuente} className={styles.fuenteBar}>
                  <span className={styles.fuenteLabel}>{FUENTE_ICONS[fuente] ?? "📋"} {fuente}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(count / metrics.total) * 100}%` }}
                    />
                  </div>
                  <span className={styles.fuenteCount}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Reporte de conversión por fuente (admin) */}
      {isAdmin && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={toggleReporte}
            style={{ border: "1px solid var(--slate-300)", background: "#fff", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <LuChartColumnStacked size={16} /> {showReporte ? "Ocultar" : "Ver"} reporte de conversión por fuente
          </button>
          {showReporte && (
            <div style={{ overflowX: "auto", marginTop: "0.75rem", border: "1px solid var(--slate-200)", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--brand)", color: "#fff", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.8rem" }}>Fuente</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>Total</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>En Progreso</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "center", color: "#a7f3d0" }}>Cerrado</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "center", color: "#fecaca" }}>Perdido</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "center", color: "var(--slate-200)" }}>Descartado</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>Tasa cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteFuentes.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "var(--slate-400)" }}>Sin datos.</td></tr>
                  ) : reporteFuentes.map((r) => (
                    <tr key={r.fuente} style={{ borderTop: "1px solid var(--slate-100)" }}>
                      <td style={{ padding: "0.55rem 0.8rem", fontWeight: 600 }}>{FUENTE_ICONS[r.fuente] ?? "📋"} {r.fuente}</td>
                      <td style={{ padding: "0.55rem 0.8rem", textAlign: "center", fontWeight: 700 }}>{r.total}</td>
                      <td style={{ padding: "0.55rem 0.8rem", textAlign: "center" }}>{r.En_Progreso}</td>
                      <td style={{ padding: "0.55rem 0.8rem", textAlign: "center", color: "#10b981", fontWeight: 700 }}>{r.Cerrado}</td>
                      <td style={{ padding: "0.55rem 0.8rem", textAlign: "center", color: "#ef4444" }}>{r.Perdido}</td>
                      <td style={{ padding: "0.55rem 0.8rem", textAlign: "center", color: "var(--slate-400)" }}>{r.Descartado}</td>
                      <td style={{ padding: "0.55rem 0.8rem", textAlign: "center", fontWeight: 700, color: r.tasaCierre >= 20 ? "#10b981" : "var(--slate-500)" }}>{r.tasaCierre}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* KPIs rápidos */}
      <div className={styles.kpiRow}>
        {["Nuevo", "Contactado", "En Progreso", "Cerrado", "Perdido", "Descartado"].map((e) => (
          <button
            key={e}
            className={`${styles.kpi} ${filterEstado === e ? styles.kpiActive : ""}`}
            style={{ borderColor: filterEstado === e ? ESTADO_COLORS[e] : undefined }}
            onClick={() => setFilterEstado(filterEstado === e ? "Todos" : e)}
          >
            <span className={styles.kpiNum} style={{ color: ESTADO_COLORS[e] }}>
              {countByEstado[e] ?? 0}
            </span>
            <span className={styles.kpiLabel}>{e}</span>
          </button>
        ))}
        {filterEstado !== "Todos" && (
          <button className={styles.clearFilter} onClick={() => setFilterEstado("Todos")}><LuX size={14} /></button>
        )}
      </div>

      {/* Toggle de vista + Nuevo lead */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
        <button
          onClick={() => setVista("lista")}
          style={{ ...toggleStyle(vista === "lista"), display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        ><LuList size={14} /> Lista</button>
        <button
          onClick={() => setVista("tablero")}
          style={{ ...toggleStyle(vista === "tablero"), display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        ><LuLayoutGrid size={14} /> Tablero</button>
        <button
          onClick={() => setShowNuevo(true)}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, border: "none", background: "var(--brand)", color: "#fff" }}
        >+ Nuevo Lead</button>
      </div>

      {vista === "tablero" ? (
        loading ? (
          <p>Cargando leads...</p>
        ) : (
          <LeadsKanban leads={leads} basePath={basePath} isAdmin={isAdmin} onMove={moverLead} />
        )
      ) : (
      <Card title={isAdmin ? `Todos los Leads (${filtered.length})` : `Mis Leads (${filtered.length})`}>
        {loading ? (
          <p>Cargando leads...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>No hay leads con ese estado.</p>
        ) : (
          <table className={styles.leadsTable}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Fuente</th>
                <th>Vehículo</th>
                {isAdmin && <th>Vendedor</th>}
                <th>Estado</th>
                <th>Seguimiento</th>
                <th>Registrado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const hoy = new Date();
                const archivado = lead.estado === "Perdido" || lead.estado === "Descartado";
                const followup = lead.fecha_followup ? new Date(lead.fecha_followup) : null;
                const followupVencido = !archivado && followup && followup < hoy && lead.estado !== "Cerrado";
                return (
                  <tr
                    key={lead.id}
                    className={followupVencido ? styles.rowAlert : ""}
                    style={archivado ? { opacity: 0.55, background: "var(--slate-50)" } : undefined}
                  >
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        {lead.temperatura && (
                          <span
                            title={`Temperatura: ${lead.temperatura}`}
                            style={{ width: 9, height: 9, borderRadius: "50%", background: TEMP_COLOR[lead.temperatura] ?? "var(--slate-300)", flexShrink: 0 }}
                          />
                        )}
                        <strong>{lead.nombre_cliente}</strong>
                        {(() => {
                          const st = sugefEstados[lead.id];
                          const avanzada = ["En Progreso", "Prueba de Manejo", "Cotizacion Enviada", "Negociacion"].includes(lead.estado);
                          let icon: React.ReactNode = null, title = "";
                          if (st === "retencion") { icon = <LuLock size={12} />; title = "SUGEF: facturado, bajo retención"; }
                          else if (st === "completo") { icon = <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />; title = "SUGEF: expediente completo"; }
                          else if (st === "incompleto") { icon = <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />; title = "SUGEF: expediente incompleto"; }
                          else if (avanzada) { icon = <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />; title = "SUGEF: sin datos"; }
                          return icon ? <span title={title} style={{ fontSize: "0.72rem", display: "inline-flex", alignItems: "center" }}>{icon}</span> : null;
                        })()}
                      </span>
                      <br />
                      <span className={styles.sub}>{lead.email_cliente}</span>
                    </td>
                    <td className={styles.fuente}>
                      {FUENTE_ICONS[lead.fuente] ?? "📋"} {lead.fuente}
                    </td>
                    <td>
                      {lead.vehiculo_interes
                        ? `${lead.vehiculo_interes.marca} ${lead.vehiculo_interes.modelo}`
                        : <span className={styles.sub}>—</span>}
                    </td>
                    {isAdmin && (
                      <td>{lead.vendedor_asignado?.nombre_completo ?? <span className={styles.sub}>Sin asignar</span>}</td>
                    )}
                    <td>
                      <span
                        className={styles.status}
                        style={{ background: ESTADO_COLORS[lead.estado] ?? "var(--slate-500)" }}
                      >
                        {lead.estado}
                      </span>
                    </td>
                    <td>
                      {archivado ? (
                        <span className={styles.sub}>—</span>
                      ) : followup ? (
                        <span className={followupVencido ? styles.followupAlert : styles.followup} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          {followupVencido ? <LuTriangleAlert size={12} /> : <LuCalendarDays size={12} />}
                          {fmtFechaLocal(lead.fecha_followup)}
                        </span>
                      ) : <span className={styles.sub}>—</span>}
                    </td>
                    <td className={styles.sub}>
                      {fmtFecha(lead.fecha_creacion)}
                    </td>
                    <td style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <Link to={`${basePath}/leads/${lead.id}`} className="btn btn-secondary">
                        Ver
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleEliminar(lead.id, lead.nombre_cliente)}
                          title="Eliminar lead"
                          style={{
                            background: "none", border: "1px solid #fca5a5",
                            borderRadius: 6, color: "#ef4444", cursor: "pointer",
                            padding: "4px 8px", fontSize: "0.8rem", lineHeight: 1,
                            display: "inline-flex", alignItems: "center",
                          }}
                        >
                          <LuX size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      )}

      {/* Modal: Nuevo Lead manual */}
      {showNuevo && (
        <div
          onClick={() => setShowNuevo(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(440px, 94vw)", padding: "1.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><LuPlus size={18} /> Nuevo Lead</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--slate-600)" }}>
                Nombre del cliente *
                <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  style={inputStyle} placeholder="Ej: María Rodríguez" autoFocus />
              </label>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <label style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "var(--slate-600)" }}>
                  Teléfono
                  <input value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                    style={inputStyle} placeholder="8888-8888" />
                </label>
                <label style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "var(--slate-600)" }}>
                  Fuente <span style={{ color: "#ef4444" }}>*</span>
                  <select
                    value={nuevo.fuente}
                    onChange={(e) => setNuevo({ ...nuevo, fuente: e.target.value, campana_id: "" })}
                    style={{ ...inputStyle, borderColor: nuevo.fuente ? "var(--slate-200)" : "#fca5a5" }}
                    required
                  >
                    <option value="">— Seleccioná la fuente —</option>
                    {FUENTES.map((f) => (
                      <option key={f} value={f}>{FUENTE_ICONS[f] ?? "📋"} {f}</option>
                    ))}
                  </select>
                </label>
              </div>
              {/* Campaña — solo si la fuente es red social y hay campañas activas */}
              {["Facebook", "Instagram", "TikTok"].includes(nuevo.fuente) && campanasActivas.filter(c => c.plataforma === nuevo.fuente).length > 0 && (
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--slate-600)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <LuMegaphone size={14} /> Campaña de {nuevo.fuente} (opcional)
                  <select
                    value={nuevo.campana_id}
                    onChange={(e) => setNuevo({ ...nuevo, campana_id: e.target.value })}
                    style={{ ...inputStyle, borderColor: "#7dd3fc" }}
                  >
                    <option value="">— Orgánico / sin campaña —</option>
                    {campanasActivas
                      .filter(c => c.plataforma === nuevo.fuente)
                      .map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)
                    }
                  </select>
                </label>
              )}
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--slate-600)" }}>
                Email
                <input value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
                  style={inputStyle} placeholder="cliente@correo.com" />
              </label>
              <p style={{ fontSize: "0.76rem", color: "var(--slate-400)", margin: 0 }}>
                Indique al menos teléfono o email. {isAdmin ? "Se asignará por turno a un vendedor." : "Quedará asignado a ti."}
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "1.25rem" }}>
              <button onClick={() => setShowNuevo(false)} style={{ padding: "0.55rem 1.1rem", borderRadius: 8, border: "1px solid var(--slate-300)", background: "#fff", color: "var(--slate-600)", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={crearLead} disabled={guardandoNuevo} style={{ padding: "0.55rem 1.1rem", borderRadius: 8, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                {guardandoNuevo ? "Guardando..." : "Crear Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 4, padding: "0.5rem 0.7rem",
  border: "1px solid var(--slate-300)", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box",
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "0.35rem",
  padding: "0.4rem 0.9rem", borderRadius: 8, cursor: "pointer",
  fontSize: "0.85rem", fontWeight: 600,
  border: `1px solid ${active ? "var(--brand)" : "var(--slate-300)"}`,
  background: active ? "var(--brand)" : "#fff",
  color: active ? "#fff" : "var(--slate-600)",
});
