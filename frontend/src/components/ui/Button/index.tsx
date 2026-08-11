import React from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Botón estándar del panel admin. Reemplaza los `style={{...}}` repetidos por
 * variantes con color/radio/tamaño consistentes (tokens de index.css).
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  children,
  className,
  ...rest
}) => {
  const cls = [styles.btn, styles[variant], styles[size], className].filter(Boolean).join(" ");
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className={styles.spinner} /> : icon}
      {children}
    </button>
  );
};
