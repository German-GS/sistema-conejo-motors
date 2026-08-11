import React from "react";
import styles from "./Badge.module.css";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "danger" | "warning" | "info" | "neutral";
}

/** Pastilla de estado (activo/pendiente/vencido/etc.) con color semántico por token. */
export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral" }) => (
  <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>
);
