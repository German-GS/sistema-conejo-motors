// src/components/VisibilityButtons/index.tsx
import { useState } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./VisibilityButtons.module.css";

type Visibilidad = "Visible" | "Oculto" | "Agotado" | "Contrapedido";

interface Props {
  vehicleId: number;
  current?: Visibilidad;
  onChanged?: (newValue: Visibilidad) => void;
}

const OPTIONS: { value: Visibilidad; label: string; emoji: string }[] = [
  { value: "Visible",       label: "Visible",       emoji: "👁" },
  { value: "Oculto",        label: "Ocultar",       emoji: "🚫" },
  { value: "Agotado",       label: "Agotado",       emoji: "📦" },
  { value: "Contrapedido",  label: "Bajo Pedido",   emoji: "🔄" },
];

export const VisibilityButtons = ({ vehicleId, current = "Visible", onChanged }: Props) => {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<Visibilidad>(current);

  const handleChange = async (newVal: Visibilidad) => {
    if (newVal === value || loading) return;
    setLoading(true);
    try {
      await apiClient.patch(`/vehicles/${vehicleId}/visibility`, { visibilidad: newVal });
      setValue(newVal);
      onChanged?.(newVal);
      toast.success(`Visibilidad: ${OPTIONS.find(o => o.value === newVal)?.label}`);
    } catch {
      toast.error("Error al cambiar visibilidad.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.group}>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          className={`${styles.btn} ${value === opt.value ? styles[`active_${opt.value}`] : ""}`}
          onClick={() => handleChange(opt.value)}
          disabled={loading}
          title={opt.label}
        >
          <span className={styles.emoji}>{opt.emoji}</span>
          <span className={styles.label}>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};
