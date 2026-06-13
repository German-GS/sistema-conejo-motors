import styles from "./Skeleton.module.css";

interface Props {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}

// Bloque de carga con efecto shimmer
export const Skeleton = ({ width = "100%", height = 16, radius = 8, style }: Props) => (
  <span
    className={styles.skeleton}
    style={{ width, height, borderRadius: radius, ...style }}
  />
);

// Conjunto de tarjetas-esqueleto para dashboards/listas
export const SkeletonCards = ({ count = 4, height = 90 }: { count?: number; height?: number }) => (
  <div className={styles.grid}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={styles.card}>
        <Skeleton height={14} width="55%" />
        <Skeleton height={height} radius={10} style={{ marginTop: 12 }} />
      </div>
    ))}
  </div>
);
