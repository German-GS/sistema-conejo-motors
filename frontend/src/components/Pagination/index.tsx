import React from "react";
import styles from "./Pagination.module.css";

interface Props {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  pageSize?: number;
  onPageSize?: (s: number) => void;
  totalItems?: number;
}

export const Pagination: React.FC<Props> = ({
  page, totalPages, onPage, pageSize, onPageSize, totalItems,
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  // Calcular rango de páginas a mostrar (máx 5)
  const range: number[] = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i);
  }

  return (
    <div className={styles.pagination}>
      {totalItems !== undefined && (
        <span className={styles.info}>
          {totalItems} resultados
        </span>
      )}

      <div className={styles.pages}>
        <button className={styles.btn} onClick={() => onPage(1)} disabled={page === 1} title="Primera">«</button>
        <button className={styles.btn} onClick={() => onPage(page - 1)} disabled={page === 1} title="Anterior">‹</button>

        {range[0] > 1 && <span className={styles.ellipsis}>…</span>}
        {range.map((p) => (
          <button
            key={p}
            className={`${styles.btn} ${p === page ? styles.active : ""}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        {range[range.length - 1] < totalPages && <span className={styles.ellipsis}>…</span>}

        <button className={styles.btn} onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Siguiente">›</button>
        <button className={styles.btn} onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Última">»</button>
      </div>

      {onPageSize && pageSize && (
        <select
          className={styles.sizeSelect}
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
        >
          {[10, 20, 50].map(s => <option key={s} value={s}>{s} por página</option>)}
        </select>
      )}
    </div>
  );
};
