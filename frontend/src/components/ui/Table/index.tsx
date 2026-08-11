import React from "react";
import styles from "./Table.module.css";

export interface TableProps {
  /** Markup normal de tabla: <thead>...</thead><tbody>...</tbody> */
  children: React.ReactNode;
  className?: string;
}

/**
 * Envoltorio de tabla estándar: scroll horizontal en el contenedor (nunca en el body),
 * encabezado sticky y estilo consistente. Reemplaza los `minWidth` fijos repetidos a mano.
 */
export const Table: React.FC<TableProps> = ({ children, className }) => (
  <div className={styles.wrap}>
    <table className={`${styles.table} ${className ?? ""}`}>{children}</table>
  </div>
);
