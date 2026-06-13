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
  onChanged?: (newValue: Visibilidad) => void;
  onClasificacionChanged?: (newValue: Clasificacion) => void;
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

export const VisibilityButtons = ({
  vehicleId,
  current = "Visible",
  clasificacion = "En Stock",
  onChanged,
  onClasificacionChanged,
}: Props) => {
  const [loading, setLoading] = useState(false);
  // Datos antiguos podían traer Agotado/Contrapedido en visibilidad → normaliza a Visible
  const [vis, setVis] = useState<Visibilidad>(current === "Oculto" ? "Oculto" : "Visible");
  const [clas, setClas] = useState<Clasificacion>(clasificacion);

  // Sincroniza con los props cuando cambian los datos del vehículo (carga async, refetch)
  useEffect(() => { setVis(current === "Oculto" ? "Oculto" : "Visible"); }, [current]);
  useEffect(() => { setClas(clasificacion); }, [clasificacion]);

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
            onClick={() => cambiarClas(opt.value)}
            disabled={loading}
            title={opt.label}
          >
            <span className={styles.emoji}>{opt.emoji}</span>
            <span className={styles.label}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
