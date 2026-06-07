// src/components/VehicleRibbon/index.tsx
// Cintillo de estado sobre la imagen del vehículo
import styles from "./VehicleRibbon.module.css";

type Visibilidad = "Visible" | "Oculto" | "Agotado" | "Contrapedido";

interface Props {
  visibilidad?: Visibilidad;
}

const LABELS: Record<string, string> = {
  Agotado:      "AGOTADO",
  Contrapedido: "BAJO PEDIDO",
  Oculto:       "OCULTO",
};

const STYLE_MAP: Record<string, string> = {
  Agotado:      styles.ribbonAgotado,
  Contrapedido: styles.ribbonContrapedido,
  Oculto:       styles.ribbonOculto,
};

export const VehicleRibbon = ({ visibilidad }: Props) => {
  if (!visibilidad || visibilidad === "Visible") return null;
  return (
    <span className={`${styles.ribbon} ${STYLE_MAP[visibilidad] ?? ""}`}>
      {LABELS[visibilidad] ?? visibilidad}
    </span>
  );
};
