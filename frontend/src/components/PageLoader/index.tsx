// frontend/src/components/PageLoader/index.tsx
import styles from "./PageLoader.module.css";

interface PageLoaderProps {
  message?: string;
}

/** Spinner de pantalla completa para estados de carga de página. */
export const PageLoader = ({ message = "Cargando..." }: PageLoaderProps) => (
  <div className={styles.wrap}>
    <div className={styles.spinner} />
    <p className={styles.msg}>{message}</p>
  </div>
);
