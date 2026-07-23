import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./AsistenciaPage.module.css";
import { Pagination } from "@/components/Pagination";
import {
  LuCalendarDays, LuChartColumnStacked, LuTriangleAlert, LuClock,
  LuCircleCheck, LuPlus, LuPencil, LuTrash2,
} from "react-icons/lu";

interface Marcaje {
  id: number;
  tipo: "entrada" | "salida" | "almuerzo_inicio" | "almuerzo_fin";
  fecha_hora: string;
  ubicacion?: string;
  nota?: string;
  es_auto_cierre?: boolean;
  hora_original?: string;
  nota_admin?: string;
  modificado_por?: { nombre_completo: string };
  usuario?: { id?: number; nombre_completo: string };
}

interface ResumenDia {
  nombre: string;
  fecha: string;
  entradas: number;
  salidas: number;
  almuerzo: string;
  horas_trabajadas: string;
  primera_entrada: string;
  ultima_salida: string;
}

const hoyStr = () => new Date().toISOString().split("T")[0];

const TZ = "America/Costa_Rica";

const fmtFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-CR", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

const fmtHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("es-CR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
};

const TIPO_LABEL: Record<string, { label: string; cls: string }> = {
  entrada:         { label: "▶ Entrada",         cls: "entrada"  },
  salida:          { label: "⏹ Salida",           cls: "salida"   },
  almuerzo_inicio: { label: "Inicio almuerzo", cls: "almuerzo" },
  almuerzo_fin:    { label: "▶ Regreso almuerzo", cls: "almuerzo" },
};

export const AsistenciaPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAdmin = location.pathname.startsWith("/admin");

  const initialTab = (() => {
    const p = searchParams.get("tab");
    if (p === "pendientes" && isAdmin) return "pendientes";
    if (p === "rango" && isAdmin) return "rango";
    if (p === "dia" && isAdmin) return "dia";
    if (p === "personal") return "personal";
    return isAdmin ? "dia" : "personal";
  })();

  const [tab, setTab] = useState<"dia" | "rango" | "personal" | "pendientes">(initialTab);
  const [fecha, setFecha] = useState(hoyStr());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(hoyStr());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Modal corrección admin
  const [corrigiendo, setCorrigiendo] = useState<Marcaje | null>(null);
  const [nuevaHora, setNuevaHora] = useState("");
  const [notaAdmin, setNotaAdmin] = useState("");
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);

  // Modal agregar salida (admin)
  const [agregandoSalida, setAgregandoSalida] = useState<{ usuarioId: number; nombre: string; fechaBase: string } | null>(null);
  const [salidaHora, setSalidaHora] = useState("");
  const [salidaNota, setSalidaNota] = useState("");
  const [guardandoSalida, setGuardandoSalida] = useState(false);

  const abrirAgregarSalida = (m: Marcaje) => {
    if (!m.usuario?.id) { toast.error("No se pudo identificar al colaborador."); return; }
    // Día del marcaje (YYYY-MM-DD en CR) + hora sugerida 18:00
    const dia = new Date(m.fecha_hora).toLocaleDateString("en-CA", { timeZone: TZ });
    setAgregandoSalida({ usuarioId: m.usuario.id, nombre: m.usuario.nombre_completo, fechaBase: dia });
    setSalidaHora(`${dia}T18:00`);
    setSalidaNota("");
  };

  const handleEliminarMarcaje = async (m: Marcaje) => {
    const info = TIPO_LABEL[m.tipo]?.label ?? m.tipo;
    if (!window.confirm(`¿Eliminar este marcaje (${info} de ${fmtHora(m.fecha_hora)})? Queda registrado en el log y no se puede deshacer.`)) return;
    try {
      await apiClient.delete(`/asistencia/${m.id}`);
      toast.success("Marcaje eliminado.");
      fetchData();
    } catch {
      toast.error("No se pudo eliminar el marcaje.");
    }
  };

  const handleAgregarSalida = async () => {
    if (!agregandoSalida || !salidaHora) {
      toast.error("Indicá la fecha y hora de salida."); return;
    }
    setGuardandoSalida(true);
    try {
      await apiClient.post("/asistencia/admin-agregar", {
        usuarioId: agregandoSalida.usuarioId,
        tipo: "salida",
        fecha_hora: salidaHora,
        nota: salidaNota,
      });
      toast.success("Salida registrada.");
      setAgregandoSalida(null);
      setSalidaHora(""); setSalidaNota("");
      fetchData();
    } catch {
      toast.error("No se pudo registrar la salida.");
    } finally {
      setGuardandoSalida(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setPage(1);
    setData([]);
    try {
      let res;
      if (tab === "dia" && isAdmin) {
        res = await apiClient.get("/asistencia/reporte-dia", { params: { fecha } });
      } else if (tab === "rango" && isAdmin) {
        res = await apiClient.get("/asistencia/reporte-rango", { params: { startDate, endDate } });
      } else if (tab === "pendientes" && isAdmin) {
        res = await apiClient.get("/asistencia/sin-salida");
      } else {
        res = await apiClient.get("/asistencia/mi-historial", { params: { startDate, endDate } });
      }
      setData(Array.isArray(res.data) ? res.data : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tab]); // eslint-disable-line

  const handleCorregir = async () => {
    if (!corrigiendo || !nuevaHora) {
      toast.error("Indicá la nueva hora de salida."); return;
    }
    setGuardandoCorreccion(true);
    try {
      await apiClient.patch(`/asistencia/${corrigiendo.id}/corregir`, {
        fecha_hora: nuevaHora,
        nota_admin: notaAdmin.trim() || "Corrección de hora por administrador",
      });
      toast.success("Marcaje corregido correctamente.");
      setCorrigiendo(null);
      setNuevaHora(""); setNotaAdmin("");
      fetchData();
    } catch {
      toast.error("No se pudo corregir el marcaje.");
    } finally {
      setGuardandoCorreccion(false);
    }
  };

  const paginated = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page]
  );
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  // IDs de colaboradores que ya tienen una salida en el día consultado
  const idsConSalida = useMemo(
    () => new Set((data as Marcaje[]).filter(m => m.tipo === "salida").map(m => m.usuario?.id).filter(Boolean)),
    [data]
  );

  // KPIs del día (admin)
  const kpisDia = useMemo(() => {
    if (tab !== "dia" || !isAdmin) return null;
    const marcajes = data as Marcaje[];
    const personas = new Set(marcajes.map(m => m.usuario?.nombre_completo ?? "—")).size;
    return {
      personas,
      entradas: marcajes.filter(m => m.tipo === "entrada").length,
      salidas:  marcajes.filter(m => m.tipo === "salida").length,
    };
  }, [data, tab, isAdmin]);

  return (
    <div>
      <div className={styles.topBar}>
        <h1>{isAdmin ? "Control de Asistencia" : "Mi Asistencia"}</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {isAdmin && (
          <>
            <button className={`${styles.tab} ${tab === "dia" ? styles.tabActive : ""}`}
              onClick={() => setTab("dia")} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuCalendarDays size={16} /> Registro del Día</button>
            <button className={`${styles.tab} ${tab === "rango" ? styles.tabActive : ""}`}
              onClick={() => setTab("rango")} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuChartColumnStacked size={16} /> Resumen por Período</button>
            <button className={`${styles.tab} ${tab === "pendientes" ? styles.tabActive : ""}`}
              onClick={() => setTab("pendientes")}
              style={{ color: tab === "pendientes" ? undefined : "#f59e0b", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <LuTriangleAlert size={16} /> Pendientes
            </button>
          </>
        )}
        <button className={`${styles.tab} ${tab === "personal" ? styles.tabActive : ""}`}
          onClick={() => setTab("personal")} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <LuClock size={16} /> {isAdmin ? "Mi Historial" : "Mis Marcajes"}
        </button>
      </div>

      {/* Controles */}
      <div className={styles.controls}>
        {tab === "pendientes" && (
          <button className="btn btn-principal" onClick={fetchData} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        )}
        {tab === "dia" && (
          <>
            <div className={styles.field}>
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} max={hoyStr()} />
            </div>
            <button className="btn btn-principal" onClick={fetchData} disabled={loading}>
              {loading ? "Cargando..." : "Consultar"}
            </button>
          </>
        )}
        {(tab === "rango" || tab === "personal") && (
          <>
            <div className={styles.field}>
              <label>Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={hoyStr()} />
            </div>
            <div className={styles.field}>
              <label>Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} max={hoyStr()} />
            </div>
            <button className="btn btn-principal" onClick={fetchData} disabled={loading}>
              {loading ? "Cargando..." : "Consultar"}
            </button>
          </>
        )}
      </div>

      {/* KPIs del día */}
      {kpisDia && (
        <div className={styles.kpiRow}>
          <div className={styles.kpi}><span className={styles.kpiN}>{kpisDia.personas}</span><span>Personas</span></div>
          <div className={styles.kpi}><span className={styles.kpiN} style={{ color: "#10b981" }}>{kpisDia.entradas}</span><span>Entradas</span></div>
          <div className={styles.kpi}><span className={styles.kpiN} style={{ color: "#ef4444" }}>{kpisDia.salidas}</span><span>Salidas</span></div>
        </div>
      )}

      {/* Resultados */}
      {loading ? (
        <p className={styles.empty}>Cargando...</p>
      ) : tab === "pendientes" ? (
        data.length === 0 ? (
          <div className={styles.empty} style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LuCircleCheck size={18} /> No hay cierres automáticos pendientes de revisión.
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Cierre Automático</th>
                    <th>Hora Original</th>
                    <th>Corregida por</th>
                    <th>Nota</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((m: Marcaje) => (
                    <tr key={m.id}>
                      <td><strong>{m.usuario?.nombre_completo ?? "—"}</strong></td>
                      <td className={styles.hora} style={{ color: "#f59e0b" }}>{fmtHora(m.fecha_hora)}<br /><span className={styles.sub}>{fmtFecha(m.fecha_hora)}</span></td>
                      <td className={styles.sub}>{m.hora_original ? fmtHora(m.hora_original) : "—"}</td>
                      <td className={styles.sub}>{m.modificado_por?.nombre_completo ?? "—"}</td>
                      <td className={styles.sub}>{m.nota_admin ?? "—"}</td>
                      <td>
                        <button className="btn btn-principal" style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                          onClick={() => { setCorrigiendo(m); setNuevaHora(""); setNotaAdmin(""); }}>
                          Corregir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : data.length === 0 ? (
        <div className={styles.empty}>No hay registros para el período seleccionado.</div>
      ) : tab === "rango" ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Colaborador</th><th>Fecha</th><th>Primera Entrada</th>
                  <th>Última Salida</th><th>Almuerzo</th><th>Entradas</th><th>Salidas</th>
                  <th>Horas Trabajadas</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r: ResumenDia, i) => (
                  <tr key={i}>
                    <td><strong>{r.nombre}</strong></td>
                    <td>{fmtFecha(r.fecha + "T12:00:00")}</td>
                    <td><span className={styles.badgeEntrada}>▶ {r.primera_entrada}</span></td>
                    <td><span className={styles.badgeSalida}>⏹ {r.ultima_salida}</span></td>
                    <td className={styles.sub}>{r.almuerzo}</td>
                    <td>{r.entradas}</td>
                    <td>{r.salidas}</td>
                    <td>
                      <strong className={parseFloat(r.horas_trabajadas) >= 8 ? styles.horasOk : styles.horasBaja}>
                        {r.horas_trabajadas} h
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} totalItems={data.length} />
        </>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {isAdmin && tab === "dia" && <th>Colaborador</th>}
                  <th>Tipo</th><th>Fecha</th><th>Hora</th><th>Nota</th>
                  {isAdmin && tab === "dia" && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((m: Marcaje) => {
                  const info = TIPO_LABEL[m.tipo] ?? { label: m.tipo, cls: "entrada" };
                  const faltaSalida = m.tipo === "entrada" && m.usuario?.id != null && !idsConSalida.has(m.usuario.id);
                  return (
                    <tr key={m.id}>
                      {isAdmin && tab === "dia" && <td><strong>{m.usuario?.nombre_completo ?? "—"}</strong></td>}
                      <td>
                        <span className={styles[`badge_${info.cls}`] ?? styles.badgeEntrada}>
                          {info.label}
                        </span>
                      </td>
                      <td>{fmtFecha(m.fecha_hora)}</td>
                      <td className={styles.hora}>{fmtHora(m.fecha_hora)}</td>
                      <td className={styles.sub}>{m.nota ?? "—"}</td>
                      {isAdmin && tab === "dia" && (
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {faltaSalida && (
                              <button className="btn btn-principal" style={{ padding: "4px 12px", fontSize: "0.8rem", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                                onClick={() => abrirAgregarSalida(m)}>
                                <LuPlus size={14} /> Registrar salida
                              </button>
                            )}
                            <button
                              style={{ padding: "4px 10px", fontSize: "0.8rem", whiteSpace: "nowrap", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", color: "#475569", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                              onClick={() => { setCorrigiendo(m); setNuevaHora(""); setNotaAdmin(""); }}>
                              <LuPencil size={14} /> Corregir
                            </button>
                            <button
                              style={{ padding: "4px 10px", fontSize: "0.8rem", whiteSpace: "nowrap", background: "#fff", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                              onClick={() => handleEliminarMarcaje(m)}>
                              <LuTrash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} totalItems={data.length} />
        </>
      )}
      {/* Modal agregar salida (admin) */}
      {agregandoSalida && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "min(460px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <h3 style={{ marginBottom: 16 }}>Registrar Salida Faltante</h3>
            <p style={{ marginBottom: 16, fontSize: "0.9rem", color: "#64748b" }}>
              Colaborador: <strong>{agregandoSalida.nombre}</strong><br />
              El colaborador no marcó su salida ese día.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", fontWeight: 600 }}>
                Fecha y hora de salida
              </label>
              <input
                type="datetime-local"
                value={salidaHora}
                onChange={e => setSalidaHora(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "#0a2540" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", fontWeight: 600 }}>
                Motivo / nota
              </label>
              <textarea
                value={salidaNota}
                onChange={e => setSalidaNota(e.target.value)}
                placeholder="Ej: El colaborador confirmó que salió a las 6pm pero olvidó marcar."
                rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "#0a2540", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secundario" onClick={() => { setAgregandoSalida(null); setSalidaHora(""); setSalidaNota(""); }}>
                Cancelar
              </button>
              <button className="btn btn-principal" onClick={handleAgregarSalida} disabled={guardandoSalida}>
                {guardandoSalida ? "Guardando..." : "Registrar Salida"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal corrección admin */}
      {corrigiendo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "min(460px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <h3 style={{ marginBottom: 16 }}>Corregir Hora del Marcaje</h3>
            <p style={{ marginBottom: 16, fontSize: "0.9rem", color: "#64748b" }}>
              Colaborador: <strong>{corrigiendo.usuario?.nombre_completo}</strong><br />
              {corrigiendo.es_auto_cierre ? "Cierre automático" : "Hora actual"}: <strong>{fmtHora(corrigiendo.fecha_hora)}</strong>
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", fontWeight: 600 }}>
                Nueva hora de salida
              </label>
              <input
                type="datetime-local"
                value={nuevaHora}
                onChange={e => setNuevaHora(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "#0a2540" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", fontWeight: 600 }}>
                Motivo de la corrección <span style={{ color: "#94a3b8", fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={notaAdmin}
                onChange={e => setNotaAdmin(e.target.value)}
                placeholder="Ej: El colaborador reportó que marcó salida pero el sistema no la registró..."
                rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "#0a2540", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secundario" onClick={() => { setCorrigiendo(null); setNuevaHora(""); setNotaAdmin(""); }}>
                Cancelar
              </button>
              <button className="btn btn-principal" onClick={handleCorregir} disabled={guardandoCorreccion}>
                {guardandoCorreccion ? "Guardando..." : "Guardar Corrección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
