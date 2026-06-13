// src/components/VehicleRibbon/index.tsx
// Cintillo de estado sobre la imagen del vehículo.
// La clasificación de inventario (Agotado/Contrapedido/No Comercial) tiene prioridad;
// si no aplica, muestra "Oculto" según la visibilidad web.
import styles from "./VehicleRibbon.module.css";

type Visibilidad = "Visible" | "Oculto" | "Agotado" | "Contrapedido";
type Clasificacion = "En Stock" | "Agotado" | "Contrapedido" | "No Comercial";

interface Props {
  visibilidad?: Visibilidad;
  clasificacion?: Clasificacion;
}

const LABELS: Record<string, string> = {
  Agotado:        "AGOTADO",
  Contrapedido:   "BAJO PEDIDO",
  "No Comercial": "NO COMERCIAL",
  Oculto:         "OCULTO",
};

const STYLE_MAP: Record<string, string> = {
  Agotado:        styles.ribbonAgotado,
  Contrapedido:   styles.ribbonContrapedido,
  "No Comercial": styles.ribbonOculto,
  Oculto:         styles.ribbonOculto,
};

export const VehicleRibbon = ({ visibilidad, clasificacion }: Props) => {
  // Prioridad: clasificación de inventario especial
  let key: string | null = null;
  if (clasificacion && clasificacion !== "En Stock") {
    key = clasificacion;
  } else if (visibilidad === "Oculto") {
    key = "Oculto";
  } else if (visibilidad === "Agotado" || visibilidad === "Contrapedido") {
    // Compatibilidad con datos antiguos antes de la migración
    key = visibilidad;
  }

  if (!key) return null;
  return (
    <span className={`${styles.ribbon} ${STYLE_MAP[key] ?? ""}`}>
      {LABELS[key] ?? key}
    </span>
  );
};
