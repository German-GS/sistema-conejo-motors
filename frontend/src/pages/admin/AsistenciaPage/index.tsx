import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./AsistenciaPage.module.css";
import { Pagination } from "@/components/Pagination";

interface Marcaje {
  id: number;
  tipo: "entrada" | "salida" | "almuerzo_inicio" | "almuerzo_fin";
  fecha_hora: string;
  ubicacion?: string;
  nota?: string;
  usuario?: { nombre_completo: string };
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
  almuerzo_inicio: { label: "🍽️ Inicio almuerzo", cls: "almuerzo" },
  almuerzo_fin:    { label: "▶ Regreso almuerzo", cls: "almuerzo" },
};

export const AsistenciaPage = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const [tab, setTab] = useState<"dia" | "rango" | "personal">(isAdmin ? "dia" : "personal");
  const [fecha, setFecha] = useState(hoyStr());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(hoyStr());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

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
      } else {
        // historial personal — usa las fechas del rango
        res = await apiClient.get("/asistencia/mi-historial", { params: { startDate, endDate } });
      }
      setData(Array.isArray(res.data) ? res.data : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al cambiar de pestaña
  useEffect(() => { fetchData(); }, [tab]); // eslint-disable-line

  const paginated = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page]
  );
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

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
              onClick={() => setTab("dia")}>📅 Registro del Día</button>
            <button className={`${styles.tab} ${tab === "rango" ? styles.tabActive : ""}`}
              onClick={() => setTab("rango")}>📊 Resumen por Período</button>
          </>
        )}
        <button className={`${styles.tab} ${tab === "personal" ? styles.tabActive : ""}`}
          onClick={() => setTab("personal")}>
          🕐 {isAdmin ? "Mi Historial" : "Mis Marcajes"}
        </button>
      </div>

      {/* Controles */}
      <div className={styles.controls}>
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
                </tr>
              </thead>
              <tbody>
                {paginated.map((m: Marcaje) => {
                  const info = TIPO_LABEL[m.tipo] ?? { label: m.tipo, cls: "entrada" };
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} totalItems={data.length} />
        </>
      )}
    </div>
  );
};
