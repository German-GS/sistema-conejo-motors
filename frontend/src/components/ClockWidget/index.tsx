import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./ClockWidget.module.css";
import { LuUtensils, LuCircle } from "react-icons/lu";

interface EstadoHoy {
  ultimo: { tipo: string; fecha_hora: string } | null;
  entradas: number;
  salidas: number;
  enAlmuerzo: boolean;
}

type TipoMarcaje = "entrada" | "salida" | "almuerzo_inicio" | "almuerzo_fin";

export const ClockWidget: React.FC = () => {
  const [estado, setEstado] = useState<EstadoHoy | null>(null);
  const [loading, setLoading] = useState(false);
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchEstado = useCallback(() => {
    apiClient.get("/asistencia/estado-hoy")
      .then((res) => setEstado(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchEstado(); }, [fetchEstado]);

  const marcar = async (tipo: TipoMarcaje) => {
    setLoading(true);
    try {
      await apiClient.post("/asistencia/marcar", { tipo });
      const msgs: Record<TipoMarcaje, string> = {
        entrada:         "✅ Entrada registrada",
        salida:          "👋 Salida registrada",
        almuerzo_inicio: "🍽️ Inicio de almuerzo registrado",
        almuerzo_fin:    "▶ Regreso de almuerzo registrado",
      };
      toast.success(msgs[tipo]);
      fetchEstado();
    } catch {
      toast.error("No se pudo registrar el marcaje.");
    } finally {
      setLoading(false);
    }
  };

  const dentroDelTrabajo = estado
    ? estado.entradas > estado.salidas || estado.enAlmuerzo
    : false;
  const enAlmuerzo = estado?.enAlmuerzo ?? false;
  const yaEntro    = estado ? estado.entradas > estado.salidas : false;

  const ultimaHora = estado?.ultimo
    ? new Date(estado.ultimo.fecha_hora).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const estadoLabel = enAlmuerzo ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuUtensils size={14} /> Almuerzo</span>
  ) : dentroDelTrabajo ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuCircle size={10} fill="currentColor" /> Dentro</span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuCircle size={10} fill="currentColor" /> Fuera</span>
  );

  const estadoClass =
    enAlmuerzo ? styles.lunch :
    dentroDelTrabajo ? styles.inside : styles.outside;

  return (
    <div className={styles.widget}>
      {/* Reloj */}
      <div className={styles.clock}>
        <span className={styles.time}>
          {hora.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className={styles.date}>
          {hora.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Estado */}
      {estado && (
        <div className={`${styles.statusPill} ${estadoClass}`}>
          {estadoLabel}
          {ultimaHora && <span className={styles.lastTime}>{ultimaHora}</span>}
        </div>
      )}

      {/* Botones según estado */}
      <div className={styles.btns}>
        {/* Sin jornada iniciada → solo Entrada */}
        {!dentroDelTrabajo && (
          <button className={`${styles.btn} ${styles.btnEntrada}`}
            onClick={() => marcar("entrada")} disabled={loading}>
            ▶ Entrada
          </button>
        )}

        {/* Dentro y no en almuerzo → Almuerzo + Salida */}
        {yaEntro && !enAlmuerzo && (
          <>
            <button className={`${styles.btn} ${styles.btnAlmuerzo}`}
              onClick={() => marcar("almuerzo_inicio")} disabled={loading}>
              <LuUtensils size={14} /> Almuerzo
            </button>
            <button className={`${styles.btn} ${styles.btnSalida}`}
              onClick={() => marcar("salida")} disabled={loading}>
              ⏹ Salida
            </button>
          </>
        )}

        {/* En almuerzo → solo Regresar */}
        {enAlmuerzo && (
          <button className={`${styles.btn} ${styles.btnEntrada}`}
            onClick={() => marcar("almuerzo_fin")} disabled={loading}>
            ▶ Regresar
          </button>
        )}
      </div>
    </div>
  );
};
