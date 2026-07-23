/**
 * CierreMesWidget
 * Muestra el estado del cierre del mes actual y permite ejecutarlo con un modal de confirmación.
 */
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./CierreMesWidget.module.css";
import {
  LuCircleCheck,
  LuTriangleAlert,
  LuCalendarDays,
  LuClipboardList,
  LuCar,
  LuWallet,
  LuUsers,
  LuTrendingDown,
  LuFileText,
} from "react-icons/lu";

const MESES = [
  "", "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

interface Snapshot {
  ventas: { cantidad: number; ingresos: number; ganancia: number };
  leads: { nuevos: number; cerrados: number; perdidos: number; activos: number };
  cotizaciones: { emitidas: number; aceptadas: number; vencidas: number };
  inventario: { disponibles: number; reservados: number };
}

const fmtCRC = (v: number) =>
  "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(v);

export const CierreMesWidget = () => {
  const hoy    = new Date();
  const mes    = hoy.getMonth() + 1;
  const anio   = hoy.getFullYear();
  const dia    = hoy.getDate();
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const nombreMes = MESES[mes];

  const [cerrado, setCerrado]     = useState<boolean | null>(null);
  const [preview, setPreview]     = useState<Snapshot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [archivar, setArchivar]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(true);

  // Recordatorio: últimos 5 días del mes
  const showReminder = dia >= diasEnMes - 4 && cerrado === false;

  const checkEstado = useCallback(async () => {
    try {
      const res = await apiClient.get("/reports/cierre-mes/preview", {
        params: { mes, anio },
      });
      setCerrado(res.data.yaExiste);
      setPreview(res.data.snapshot);
    } catch {
      // silencioso
    } finally {
      setChecking(false);
    }
  }, [mes, anio]);

  useEffect(() => { checkEstado(); }, [checkEstado]);

  const handleCerrar = async () => {
    setLoading(true);
    try {
      await apiClient.post("/reports/cierre-mes", {
        mes, anio, archivarLeads: archivar,
      });
      toast.success(`✅ Cierre de ${nombreMes} ${anio} guardado exitosamente.`);
      setCerrado(true);
      setShowModal(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al ejecutar el cierre.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <>
      <div className={`${styles.widget} ${showReminder ? styles.widgetUrgente : ""}`}>
        <div className={styles.left}>
          <span className={styles.icon}>{cerrado ? <LuCircleCheck /> : showReminder ? <LuTriangleAlert /> : <LuCalendarDays />}</span>
          <div>
            <div className={styles.titulo}>
              Cierre de Mes — {nombreMes} {anio}
            </div>
            <div className={styles.sub}>
              {cerrado
                ? `Mes cerrado · informe guardado en Informes`
                : showReminder
                ? `Quedan ${diasEnMes - dia} días para fin de mes — recuerde hacer el cierre`
                : `Día ${dia} de ${diasEnMes} · ${diasEnMes - dia} días restantes`}
            </div>
          </div>
        </div>
        {!cerrado && (
          <button
            className={`${styles.btn} ${showReminder ? styles.btnUrgente : ""}`}
            onClick={() => setShowModal(true)}
          >
            Cerrar Mes
          </button>
        )}
      </div>

      {/* ── Modal de confirmación ── */}
      {showModal && preview && (
        <div className={styles.overlay} onClick={() => !loading && setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><LuClipboardList size={22} /> Cierre de {nombreMes} {anio}</h2>
            <p className={styles.modalSub}>Resumen del mes que se va a archivar:</p>

            <div className={styles.statsGrid}>
              <StatBox icon={<LuCar />} label="Ventas" value={String(preview.ventas.cantidad)} sub={fmtCRC(preview.ventas.ingresos)} />
              <StatBox icon={<LuWallet />} label="Ganancia" value={fmtCRC(preview.ventas.ganancia)} sub="bruta estimada" />
              <StatBox icon={<LuUsers />} label="Leads nuevos" value={String(preview.leads.nuevos)} sub={`${preview.leads.cerrados} cerrados`} />
              <StatBox icon={<LuTrendingDown />} label="Leads perdidos" value={String(preview.leads.perdidos)} sub="este mes" />
              <StatBox icon={<LuFileText />} label="Cotizaciones" value={String(preview.cotizaciones.emitidas)} sub={`${preview.cotizaciones.aceptadas} aceptadas`} />
              <StatBox icon={<LuCar />} label="Inventario" value={String(preview.inventario.disponibles)} sub="disponibles al cierre" />
            </div>

            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={archivar}
                onChange={e => setArchivar(e.target.checked)}
              />
              <span>
                Archivar leads activos sin cierre como "Perdido" y cancelar cotizaciones vencidas
              </span>
            </label>

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowModal(false)} disabled={loading}>
                Cancelar
              </button>
              <button className={styles.btnConfirm} onClick={handleCerrar} disabled={loading}>
                {loading ? "Guardando..." : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <LuCircleCheck size={16} /> Confirmar Cierre de {nombreMes}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StatBox = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) => (
  <div className={styles.statBox}>
    <span className={styles.statIcon}>{icon}</span>
    <div className={styles.statLabel}>{label}</div>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statSub}>{sub}</div>
  </div>
);
