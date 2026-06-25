// frontend/src/pages/admin/sales/LeadsPage.tsx
import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { LeadsKanban } from "@/components/LeadsKanban";
import styles from "./LeadsPage.module.css";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";

interface Lead {
  id: number;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string;
  estado: string;
  fuente: string;
  fecha_followup?: string;
  fecha_creacion: string;
  vehiculo_interes?: { marca: string; modelo: string };
  vendedor_asignado?: { nombre_completo: string };
}

const ESTADO_COLORS: Record<string, string> = {
  Nuevo: "#3b82f6", Contactado: "#f59e0b", "En Progreso": "#8b5cf6",
  Cerrado: "#10b981", Perdido: "#ef4444",
};

const FUENTE_ICONS: Record<string, string> = {
  Web: "🌐", Instagram: "📸", Facebook: "👍", WhatsApp: "💬",
  TikTok: "🎵", Referido: "🤝", Presencial: "🏢", Otro: "📋",
};

export const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [vista, setVista] = useState<"lista" | "tablero">("lista");
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", telefono: "", email: "", fuente: "Presencial", campana_id: "" });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [campanasActivas, setCampanasActivas] = useState<{ id: number; nombre: string; plataforma: string }[]>([]);
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
    if (!nuevo.email.trim() && !nuevo.telefono.trim()) return toast.error("Indique email o teléfono.");
    setGuardandoNuevo(true);
    try {
      await apiClient.post("/leads/manual", {
        ...nuevo,
        campana_id: nuevo.campana_id ? Number(nuevo.campana_id) : undefined,
      });
      toast.success("Lead creado.");
      setShowNuevo(false);
      setNuevo({ nombre: "", telefono: "", email: "", fuente: "Presencial", campana_id: "" });
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

      {/* KPIs rápidos */}
      <div className={styles.kpiRow}>
        {["Nuevo", "Contactado", "En Progreso", "Cerrado", "Perdido"].map((e) => (
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
          <button className={styles.clearFilter} onClick={() => setFilterEstado("Todos")}>✕</button>
        )}
      </div>

      {/* Toggle de vista + Nuevo lead */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
        <button
          onClick={() => setVista("lista")}
          style={toggleStyle(vista === "lista")}
        >☰ Lista</button>
        <button
          onClick={() => setVista("tablero")}
          style={toggleStyle(vista === "tablero")}
        >▦ Tablero</button>
        <button
          onClick={() => setShowNuevo(true)}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, border: "none", background: "#024f7d", color: "#fff" }}
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
                const perdido = lead.estado === "Perdido";
                const followup = lead.fecha_followup ? new Date(lead.fecha_followup) : null;
                const followupVencido = !perdido && followup && followup < hoy && lead.estado !== "Cerrado";
                return (
                  <tr
                    key={lead.id}
                    className={followupVencido ? styles.rowAlert : ""}
                    style={perdido ? { opacity: 0.55, background: "#f8fafc" } : undefined}
                  >
                    <td>
                      <strong>{lead.nombre_cliente}</strong>
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
                        style={{ background: perdido ? "#94a3b8" : (ESTADO_COLORS[lead.estado] ?? "#64748b") }}
                      >
                        {lead.estado}
                      </span>
                    </td>
                    <td>
                      {perdido ? (
                        <span className={styles.sub}>—</span>
                      ) : followup ? (
                        <span className={followupVencido ? styles.followupAlert : styles.followup}>
                          {followupVencido ? "⚠️ " : "📅 "}
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
                          }}
                        >
                          ✕
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
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>➕ Nuevo Lead</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Nombre del cliente *
                <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  style={inputStyle} placeholder="Ej: María Rodríguez" autoFocus />
              </label>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <label style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Teléfono
                  <input value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                    style={inputStyle} placeholder="8888-8888" />
                </label>
                <label style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Fuente
                  <select value={nuevo.fuente} onChange={(e) => setNuevo({ ...nuevo, fuente: e.target.value, campana_id: "" })} style={inputStyle}>
                    {["Presencial", "Llamada", "WhatsApp", "Referido", "Instagram", "Facebook", "TikTok", "Otro"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
              </div>
              {/* Campaña — solo si la fuente es red social y hay campañas activas */}
              {["Facebook", "Instagram", "TikTok"].includes(nuevo.fuente) && campanasActivas.filter(c => c.plataforma === nuevo.fuente).length > 0 && (
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  📣 Campaña de {nuevo.fuente} (opcional)
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
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Email
                <input value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
                  style={inputStyle} placeholder="cliente@correo.com" />
              </label>
              <p style={{ fontSize: "0.76rem", color: "#94a3b8", margin: 0 }}>
                Indique al menos teléfono o email. {isAdmin ? "Se asignará por turno a un vendedor." : "Quedará asignado a ti."}
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "1.25rem" }}>
              <button onClick={() => setShowNuevo(false)} style={{ padding: "0.55rem 1.1rem", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={crearLead} disabled={guardandoNuevo} style={{ padding: "0.55rem 1.1rem", borderRadius: 8, border: "none", background: "#024f7d", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
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
  border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box",
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "0.35rem",
  padding: "0.4rem 0.9rem", borderRadius: 8, cursor: "pointer",
  fontSize: "0.85rem", fontWeight: 600,
  border: `1px solid ${active ? "#024f7d" : "#cbd5e1"}`,
  background: active ? "#024f7d" : "#fff",
  color: active ? "#fff" : "#475569",
});
