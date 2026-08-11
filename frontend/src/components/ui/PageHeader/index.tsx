import React from "react";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  /** Título de la página. Puede incluir un icono como children de un span flex. */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Botones/acciones alineados a la derecha (ej. "Exportar", "Nuevo"). */
  actions?: React.ReactNode;
}

/**
 * Encabezado estándar de página del panel admin: título + subtítulo a la izquierda,
 * acciones a la derecha. Los breadcrumbs ya se renderizan globalmente en AdminLayout,
 * así que este componente no los duplica.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className={styles.wrap}>
    <div className={styles.titles}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);
