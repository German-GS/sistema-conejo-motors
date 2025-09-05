import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
      </div>
      <div className={styles.cardContent}>{children}</div>
    </div>
  );
};
