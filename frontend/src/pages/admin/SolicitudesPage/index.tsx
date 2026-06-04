import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./SolicitudesPage.module.css";

type TipoSolicitud = "dia_libre" | "vacaciones" | "salida_anticipada" | "llegada_tarde" | "permiso_personal" | "otro";
type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

interface Solicitud {
  id: number;
  tipo: TipoSolicitud;
  fecha_inicio: string;
  fecha_fin?: string;
  hora?: string;
  motivo: string;
  estado: EstadoSolicitud;
  respuesta_admin?: string;
  fecha_creacion: string;
  empleado?: { nombre_completo: string };
  revisado_por?: { nombre_completo: string };
}

const TIPO_LABELS: Record<TipoSolicitud, string> = {
  dia_libre:         "🏖️ Día libre",
  vacaciones:        "🌴 Vacaciones",
  salida_anticipada: "🚪 Salida anticipada",
  llegada_tarde:     "⏰ Llegada tarde",
  permiso_personal:  "📋 Permiso personal",
  otro:              "📌 Otro",
};

const ESTADO_COLORS: Record<EstadoSolicitud, string> = {
  pendiente: "#f59e0b",
  aprobada:  "#10b981",
  rechazada: "#ef4444",
};

const hoyStr = () => new Date().toISOString().split("T")[0];
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "short", year: "numeric" });

const TIPOS_CON_RANGO: TipoSolicitud[] = ["vacaciones"];
const TIPOS_CON_HORA:  TipoSolicitud[] = ["salida_anticipada", "llegada_tarde"];

export const SolicitudesPage = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mis" | "todas">(isAdmin ? "todas" : "mis");
  const [showForm, setShowForm] = useState(false);
  const [pendienteCount, setPendienteCount] = useState(0);

  // Formulario nueva solicitud
  const [tipo, setTipo] = useState<TipoSolicitud>("dia_libre");
  const [fechaInicio, setFechaInicio] = useState(hoyStr());
  const [fechaFin, setFechaFin] = useState(hoyStr());
  const [hora, setHora] = useState("17:00");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resolución (admin)
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState("");

  const fetchData = (currentTab: "mis" | "todas") => {
    setLoading(true);
    const endpoint = currentTab === "todas" ? "/solicitudes" : "/solicitudes/mis";
    apiClient.get(endpoint)
      .then(res => setSolicitudes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSolicitudes([]))
      .finally(() => setLoading(false));
  };

  // Para admin: siempre tener el conteo de pendientes actualizado (para el badge)
  const fetchPendienteCount = () => {
    if (!isAdmin) return;
    apiClient.get("/solicitudes/pendientes")
      .then(res => setPendienteCount(Array.isArray(res.data) ? res.data.length : 0))
      .catch(() => {});
  };

  useEffect(() => {
    fetchData(tab);
    fetchPendienteCount();
  }, [tab]); // eslint-disable-line

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) { toast.error("Escribe el motivo."); return; }
    setSubmitting(true);
    try {
      await apiClient.post("/solicitudes", {
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: TIPOS_CON_RANGO.includes(tipo) ? fechaFin : fechaInicio,
        hora: TIPOS_CON_HORA.includes(tipo) ? hora : undefined,
        motivo,
      });
      toast.success("✅ Solicitud enviada correctamente.");
      setMotivo("");
      setShowForm(false);
      setTab("mis");
    } catch {
      toast.error("Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolver = async (id: number, decision: "aprobada" | "rechazada") => {
    try {
      await apiClient.patch(`/solicitudes/${id}/resolver`, { decision, respuesta });
      toast.success(decision === "aprobada" ? "✅ Solicitud aprobada" : "❌ Solicitud rechazada");
      setResolvingId(null);
      setRespuesta("");
      fetchData();
    } catch {
      toast.error("Error al procesar la solicitud.");
    }
  };

  const pendientes = solicitudes.filter(s => s.estado === "pendiente").length;

  return (
    <div>
      <div className={styles.topBar}>
        <h1>Solicitudes</h1>
        <button
          className={styles.newBtn}
          onClick={() => { setShowForm(!showForm); setTab("nueva"); }}
        >
          + Nueva Solicitud
        </button>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <div className={styles.formCard}>
          <h3>Nueva Solicitud</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>Tipo de solicitud</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as TipoSolicitud)}>
                {Object.entries(TIPO_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>{TIPOS_CON_RANGO.includes(tipo) ? "Fecha inicio" : "Fecha"}</label>
              <input type="date" value={fechaInicio} min={hoyStr()}
                onChange={e => setFechaInicio(e.target.value)} />
            </div>

            {TIPOS_CON_RANGO.includes(tipo) && (
              <div className={styles.field}>
                <label>Fecha fin</label>
                <input type="date" value={fechaFin} min={fechaInicio}
                  onChange={e => setFechaFin(e.target.value)} />
              </div>
            )}

            {TIPOS_CON_HORA.includes(tipo) && (
              <div className={styles.field}>
                <label>Hora</label>
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} />
              </div>
            )}

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Motivo / Descripción *</label>
              <textarea rows={3} value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Explica brevemente el motivo de tu solicitud..." />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-principal" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar Solicitud"}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => { setShowForm(false); setTab(isAdmin ? "todas" : "mis"); }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      {!showForm && (
        <>
          <div className={styles.tabs}>
            {isAdmin && (
              <button className={`${styles.tab} ${tab === "todas" ? styles.tabActive : ""}`}
                onClick={() => setTab("todas")}>
                📋 Todas
                {pendientes > 0 && tab !== "todas" && (
                  <span className={styles.badge}>{pendientes}</span>
                )}
              </button>
            )}
            <button className={`${styles.tab} ${tab === "mis" ? styles.tabActive : ""}`}
              onClick={() => setTab("mis")}>
              👤 Mis Solicitudes
            </button>
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando...</p>
          ) : solicitudes.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay solicitudes registradas.</p>
              <button className={styles.newBtn} onClick={() => setShowForm(true)}>
                Crear tu primera solicitud
              </button>
            </div>
          ) : (
            <div className={styles.list}>
              {solicitudes.map(s => (
                <div key={s.id} className={`${styles.card} ${styles[`card_${s.estado}`]}`}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.tipo}>{TIPO_LABELS[s.tipo]}</span>
                      {isAdmin && s.empleado && (
                        <span className={styles.empleado}>{s.empleado.nombre_completo}</span>
                      )}
                    </div>
                    <span
                      className={styles.estadoBadge}
                      style={{ background: ESTADO_COLORS[s.estado] }}
                    >
                      {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.fechas}>
                      <span>📅 {fmtFecha(s.fecha_inicio)}</span>
                      {s.fecha_fin && s.fecha_fin !== s.fecha_inicio && (
                        <span> → {fmtFecha(s.fecha_fin)}</span>
                      )}
                      {s.hora && <span> · 🕐 {s.hora}</span>}
                    </div>
                    <p className={styles.motivo}>{s.motivo}</p>
                    {s.respuesta_admin && (
                      <div className={styles.respuesta}>
                        <strong>Respuesta:</strong> {s.respuesta_admin}
                        {s.revisado_por && <span className={styles.sub}> — {s.revisado_por.nombre_completo}</span>}
                      </div>
                    )}
                    <span className={styles.fecha}>Enviada el {fmtFecha(s.fecha_creacion)}</span>
                  </div>

                  {/* Panel de resolución para admin */}
                  {isAdmin && s.estado === "pendiente" && (
                    <div className={styles.resolveArea}>
                      {resolvingId === s.id ? (
                        <>
                          <textarea
                            className={styles.respuestaInput}
                            rows={2}
                            placeholder="Respuesta al empleado (opcional)..."
                            value={respuesta}
                            onChange={e => setRespuesta(e.target.value)}
                          />
                          <div className={styles.resolveActions}>
                            <button className={styles.btnAprobar}
                              onClick={() => handleResolver(s.id, "aprobada")}>
                              ✅ Aprobar
                            </button>
                            <button className={styles.btnRechazar}
                              onClick={() => handleResolver(s.id, "rechazada")}>
                              ❌ Rechazar
                            </button>
                            <button className={styles.btnCancelar}
                              onClick={() => { setResolvingId(null); setRespuesta(""); }}>
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <button className={styles.btnResolver}
                          onClick={() => setResolvingId(s.id)}>
                          Revisar solicitud →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
