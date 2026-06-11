/**
 * QuotesExpiringWidget
 * Panel reutilizable que muestra cotizaciones próximas a vencer.
 * Usado en DashboardHomePage (Admin) y SalesDashboardPage (Ventas).
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./QuotesExpiringWidget.module.css";

interface AlertaVencimiento {
  id: number;
  cliente: string;
  vehiculo: string;
  fecha_expiracion: string;
  horasRestantes: number;
}

interface AlertasReserva {
  vencenHoy: number;
  vencenManana: number;
  lista: AlertaVencimiento[];
}

interface Props {
  /** Ruta base de navegación: "/admin" o "/admin/sales" */
  basePath?: string;
  /** Datos ya cargados externamente (evita doble fetch si el padre ya los tiene) */
  data?: AlertasReserva | null;
}

const urgencyClass = (horas: number, moduleStyles: CSSModuleClasses) => {
  if (horas <= 0)  return moduleStyles.badgeVencida;
  if (horas <= 24) return moduleStyles.badgeHoy;
  if (horas <= 48) return moduleStyles.badgeManana;
  return moduleStyles.badgeProxima;
};

const urgencyLabel = (horas: number) => {
  if (horas <= 0)  return "⚠️ Vencida";
  if (horas <= 24) return `⏰ Vence hoy (${horas}h)`;
  if (horas <= 48) return `🕐 Vence mañana`;
  const dias = Math.ceil(horas / 24);
  return `📅 ${dias} día${dias !== 1 ? "s" : ""} restantes`;
};

// Helper para CSSModuleClasses type
type CSSModuleClasses = Record<string, string>;

export const QuotesExpiringWidget = ({ basePath = "/admin", data: externalData }: Props) => {
  const navigate = useNavigate();
  const [alertas, setAlertas]   = useState<AlertasReserva | null>(externalData ?? null);
  const [loading, setLoading]   = useState(!externalData);
  const [expanded, setExpanded] = useState(true);

  const fetchAlertas = useCallback(async () => {
    try {
      const res = await apiClient.get("/quotes/alertas/vencimiento");
      setAlertas(res.data);
    } catch {
      // endpoint puede no estar disponible — silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!externalData) fetchAlertas();
  }, [externalData, fetchAlertas]);

  // Si hay datos externos, sincronizar cuando cambien
  useEffect(() => {
    if (externalData !== undefined) setAlertas(externalData);
  }, [externalData]);

  const lista       = alertas?.lista ?? [];
  const urgentCount = lista.filter(a => a.horasRestantes <= 24).length;
  const vencidas    = lista.filter(a => a.horasRestantes <= 0).length;
  const activas     = lista.filter(a => a.horasRestantes > 0).length;

  return (
    <div className={styles.widget}>
      {/* ── Cabecera ── */}
      <div className={styles.header} onClick={() => setExpanded(v => !v)}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>📄</span>
          <div>
            <span className={styles.headerTitle}>Cotizaciones Activas</span>
            <span className={styles.headerSub}>
              {loading
                ? "Cargando..."
                : lista.length === 0
                ? "Sin cotizaciones activas"
                : vencidas > 0
                ? `${activas} activa${activas !== 1 ? "s" : ""} · ${vencidas} vencida${vencidas !== 1 ? "s" : ""}`
                : `${lista.length} cotizaci${lista.length === 1 ? "ón" : "ones"} activa${lista.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {vencidas > 0 && (
            <span className={styles.chipVencida}>{vencidas} vencida{vencidas > 1 ? "s" : ""}</span>
          )}
          {urgentCount - vencidas > 0 && (
            <span className={styles.chipHoy}>{urgentCount - vencidas} vence hoy</span>
          )}
          {alertas && alertas.vencenManana > 0 && (
            <span className={styles.chipManana}>{alertas.vencenManana} mañana</span>
          )}
          <button
            className={styles.toggleBtn}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            title={expanded ? "Colapsar" : "Expandir"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      {expanded && (
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} />
              <span>Cargando alertas...</span>
            </div>
          ) : lista.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📄</span>
              <p>No hay cotizaciones activas en este momento.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {lista.map((a) => (
                <div
                  key={a.id}
                  className={`${styles.row} ${a.horasRestantes <= 0 ? styles.rowVencida : a.horasRestantes <= 24 ? styles.rowHoy : ""}`}
                  onClick={() => navigate(`${basePath}/sales/quotes/${a.id}`)}
                  title="Ver detalle de cotización"
                >
                  {/* ID + vehículo */}
                  <div className={styles.cellMain}>
                    <span className={styles.quoteId}>#{a.id}</span>
                    <span className={styles.vehiculo}>{a.vehiculo}</span>
                  </div>

                  {/* Cliente */}
                  <div className={styles.cellCliente}>
                    <span className={styles.clienteLabel}>👤</span>
                    <span className={styles.clienteNombre}>{a.cliente}</span>
                  </div>

                  {/* Fecha expiración */}
                  <div className={styles.cellFecha}>
                    <span className={styles.fechaLabel}>Vence</span>
                    <span className={styles.fechaVal}>
                      {new Date(a.fecha_expiracion + "T00:00:00").toLocaleDateString("es-CR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Badge urgencia */}
                  <div className={styles.cellBadge}>
                    <span className={urgencyClass(a.horasRestantes, styles as CSSModuleClasses)}>
                      {urgencyLabel(a.horasRestantes)}
                    </span>
                  </div>

                  {/* Acción */}
                  <div className={styles.cellAction}>
                    <span className={styles.viewBtn}>Ver →</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer con link a todas las cotizaciones */}
          {lista.length > 0 && (
            <div className={styles.footer}>
              <button
                className={styles.footerLink}
                onClick={() => navigate(`${basePath}/sales/quotes`)}
              >
                Ver todas las cotizaciones →
              </button>
              <span className={styles.footerNote}>
                Se actualiza automáticamente · click en una fila para ver el detalle
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
