import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./LeadsFollowUpWidget.module.css";

interface Lead {
  id: number;
  nombre_cliente: string;
  estado: string;
  fecha_followup: string | null;
  fuente: string;
  vendedor_asignado?: { nombre_completo: string };
}

interface SemaforoInfo {
  color: "rojo" | "amarillo" | "verde" | "sin_fecha";
  label: string;
  dias: number | null;
}

function semaforo(fechaFollowup: string | null): SemaforoInfo {
  if (!fechaFollowup) return { color: "sin_fecha", label: "Sin fecha", dias: null };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaFollowup + "T00:00:00");
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0)  return { color: "rojo",     label: `Venció hace ${Math.abs(dias)} día(s)`, dias };
  if (dias === 0) return { color: "rojo",     label: "Vence HOY ⚠️",                         dias };
  if (dias === 1) return { color: "rojo",     label: "Vence MAÑANA 🔴",                      dias };
  if (dias === 2) return { color: "amarillo", label: "Vence en 2 días 🟡",                   dias };
  if (dias <= 5)  return { color: "amarillo", label: `Vence en ${dias} días`,                dias };
  return               { color: "verde",      label: `En ${dias} días`,                      dias };
}

interface Props {
  basePath?: string;
  showVendedor?: boolean;
}

export const LeadsFollowUpWidget = ({ basePath = "/admin", showVendedor = false }: Props) => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/leads?limit=50")
      .then(r => {
        const todos = r.data.leads || r.data || [];
        // Estados terminales que NO son "activos" (alineado con el backend):
        // Cerrado (ganado), Perdido y Descartado quedan fuera.
        const activos = todos.filter(
          (l: Lead) => !["Cerrado", "Perdido", "Descartado"].includes(l.estado)
        );
        activos.sort((a: Lead, b: Lead) => {
          const da = a.fecha_followup ? new Date(a.fecha_followup).getTime() : Infinity;
          const db = b.fecha_followup ? new Date(b.fecha_followup).getTime() : Infinity;
          return da - db;
        });
        setLeads(activos.slice(0, 12));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const urgentes = leads.filter(l => semaforo(l.fecha_followup).color === "rojo").length;

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <div className={styles.titleRow}>
          <span className={styles.title}>📋 Leads activos</span>
          {urgentes > 0 && (
            <span className={styles.alertBadge}>⚠️ {urgentes} urgente{urgentes > 1 ? "s" : ""}</span>
          )}
        </div>
        <button className={styles.verTodos} onClick={() => navigate(`${basePath}/leads`)}>
          Ver todos →
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : leads.length === 0 ? (
        <div className={styles.empty}>No hay leads activos</div>
      ) : (
        <div className={styles.lista}>
          {leads.map(lead => {
            const s = semaforo(lead.fecha_followup);
            return (
              <div
                key={lead.id}
                className={`${styles.leadRow} ${styles[`row_${s.color}`]}`}
                onClick={() => navigate(`${basePath}/leads/${lead.id}`)}
              >
                <div className={`${styles.semaforo} ${styles[`sf_${s.color}`]}`} title={s.label} />
                <div className={styles.leadInfo}>
                  <span className={styles.nombre}>{lead.nombre_cliente}</span>
                  <div className={styles.metaRow}>
                    <span className={styles.estadoPill}>{lead.estado}</span>
                    {showVendedor && lead.vendedor_asignado && (
                      <span className={styles.vendedor}>{lead.vendedor_asignado.nombre_completo}</span>
                    )}
                  </div>
                </div>
                <div className={styles.followupCol}>
                  <span className={`${styles.semaforoLabel} ${styles[`lbl_${s.color}`]}`}>
                    {s.label}
                  </span>
                  {lead.fecha_followup && (
                    <span className={styles.fecha}>
                      {new Date(lead.fecha_followup + "T00:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
