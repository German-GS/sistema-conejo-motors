import React from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

/** Barra de pestañas reutilizable (Contabilidad y Ajustes hoy la reinventan a mano). */
export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => (
  <div className={styles.tabs} role="tablist">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={t.id === active}
        className={`${styles.tab} ${t.id === active ? styles.tabActive : ""}`}
        onClick={() => onChange(t.id)}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
);
