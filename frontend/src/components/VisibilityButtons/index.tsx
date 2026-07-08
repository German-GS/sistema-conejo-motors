// src/components/VisibilityButtons/index.tsx
// Dos controles independientes:
//  1) Visibilidad web: Visible / Oculto
//  2) Clasificación de inventario: En Stock / Agotado / Bajo Pedido / No Comercial
import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./VisibilityButtons.module.css";

type Visibilidad = "Visible" | "Oculto";
type Clasificacion = "En Stock" | "Agotado" | "Contrapedido" | "No Comercial";

interface Props {
  vehicleId: number;
  current?: "Visible" | "Oculto" | "Agotado" | "Contrapedido";
  clasificacion?: Clasificacion;
  estado?: "Disponible" | "Reservado" | "Vendido" | "Demo";
  onChanged?: (newValue: Visibilidad) => void;
  onClasificacionChanged?: (newValue: Clasificacion) => void;
  onEstadoChanged?: (newValue: "Disponible" | "Demo") => void;
}

const VIS_OPTIONS: { value: Visibilidad; label: string; emoji: string }[] = [
  { value: "Visible", label: "Visible", emoji: "👁" },
  { value: "Oculto",  label: "Ocultar", emoji: "🚫" },
];

const CLAS_OPTIONS: { value: Clasificacion; label: string; emoji: string }[] = [
  { value: "En Stock",     label: "En stock",     emoji: "✅" },
  { value: "Agotado",      label: "Agotado",      emoji: "📦" },
  { value: "Contrapedido", label: "Bajo Pedido",  emoji: "🔄" },
  { value: "No Comercial", label: "No Comercial", emoji: "⛔" },
];

const clasKey: Record<Clasificacion, string> = {
  "En Stock": "EnStock",
  Agotado: "Agotado",
  Contrapedido: "Contrapedido",
  "No Comercial": "NoComercial",
};

// Color sólido por estado (se aplica inline al activarse, infalible ante caché/CSS)
const COLOR_ACTIVO: Record<string, string> = {
  Visible: "#16a34a",
  Oculto: "#64748b",
  "En Stock": "#16a34a",
  Agotado: "#dc2626",
  Contrapedido: "#2563eb",
  "No Comercial": "#7c3aed",
};

const estiloActivo = (activo: boolean, value: string): React.CSSProperties =>
  activo
    ? { background: COLOR_ACTIVO[value], borderColor: COLOR_ACTIVO[value], color: "#fff", fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }
    : {};

export const VisibilityButtons = ({
  vehicleId,
  current = "Visible",
  clasificacion = "En Stock",
  estado = "Disponible",
  onChanged,
  onClasificacionChanged,
  onEstadoChanged,
}: Props) => {
  const [loading, setLoading] = useState(false);
  // Datos antiguos podían traer Agotado/Contrapedido en visibilidad → normaliza a Visible
  const [vis, setVis] = useState<Visibilidad>(current === "Oculto" ? "Oculto" : "Visible");
  const [clas, setClas] = useState<Clasificacion>(clasificacion);
  const [esDemo, setEsDemo] = useState(estado === "Demo");

  // Sincroniza con los props cuando cambian los datos del vehículo (carga async, refetch)
  useEffect(() => { setVis(current === "Oculto" ? "Oculto" : "Visible"); }, [current]);
  useEffect(() => { setClas(clasificacion); }, [clasificacion]);
  useEffect(() => { setEsDemo(estado === "Demo"); }, [estado]);

  const vendido = estado === "Vendido";

  const toggleDemo = async () => {
    if (loading || vendido) return;
    const activar = !esDemo;
    setLoading(true);
    try {
      await apiClient.patch(`/vehicles/${vehicleId}/${activar ? "demo" : "quitar-demo"}`);
      setEsDemo(activar);
      onEstadoChanged?.(activar ? "Demo" : "Disponible");
      if (activar) { setVis("Oculto"); setClas("No Comercial"); }
      else { setVis("Visible"); setClas("En Stock"); }
      toast.success(activar ? "Marcado como Demo / Test drive (Activo Fijo)" : "Regresado a inventario de venta");
    } catch {
      toast.error("Error al cambiar el estado Demo.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarVis = async (newVal: Visibilidad) => {
    if (newVal === vis || loading) return;
    setLoading(true);
    try {
      await apiClient.patch(`/vehicles/${vehicleId}/visibility`, { visibilidad: newVal });
      setVis(newVal);
      onChanged?.(newVal);
      toast.success(`Visibilidad: ${newVal === "Visible" ? "Visible" : "Oculto"}`);
    } catch {
      toast.error("Error al cambiar visibilidad.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarClas = async (newVal: Clasificacion) => {
    if (newVal === clas || loading) return;
    setLoading(true);
    try {
      await apiClient.patch(`/vehicles/${vehicleId}/clasificacion`, { clasificacion: newVal });
      setClas(newVal);
      onClasificacionChanged?.(newVal);
      toast.success(`Inventario: ${newVal}`);
    } catch {
      toast.error("Error al cambiar la clasificación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.row}>
        <span className={styles.miniLabel}>Web</span>
        {VIS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`${styles.btn} ${vis === opt.value ? styles[`active_${opt.value}`] : ""}`}
            style={estiloActivo(vis === opt.value, opt.value)}
            onClick={() => cambiarVis(opt.value)}
            disabled={loading}
            title={opt.label}
          >
            <span className={styles.emoji}>{opt.emoji}</span>
            <span className={styles.label}>{opt.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span className={styles.miniLabel}>Inventario</span>
        {CLAS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`${styles.btn} ${clas === opt.value ? styles[`active_${clasKey[opt.value]}`] : ""}`}
            style={estiloActivo(clas === opt.value, opt.value)}
            onClick={() => cambiarClas(opt.value)}
            disabled={loading}
            title={opt.label}
          >
            <span className={styles.emoji}>{opt.emoji}</span>
            <span className={styles.label}>{opt.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <span className={styles.miniLabel}>Uso</span>
        <button
          className={styles.btn}
          style={estiloActivo(esDemo, "No Comercial")}
          onClick={toggleDemo}
          disabled={loading || vendido}
          title={esDemo ? "Regresar a inventario de venta" : "Marcar como Demo / Test drive (Activo Fijo, no para venta)"}
        >
          <span className={styles.emoji}>🚗</span>
          <span className={styles.label}>{esDemo ? "Demo / Test drive" : "Marcar Demo"}</span>
        </button>
      </div>
    </div>
  );
};
