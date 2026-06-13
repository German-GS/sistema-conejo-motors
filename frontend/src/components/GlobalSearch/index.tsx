import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./GlobalSearch.module.css";

interface SearchResult {
  tipo: "vehiculo" | "cliente" | "cotizacion" | "factura";
  id: number;
  titulo: string;
  subtitulo: string;
  icono: string;
  ruta: string;
}

const GROUP_LABEL: Record<string, string> = {
  vehiculo: "Vehículos",
  cliente: "Clientes",
  cotizacion: "Cotizaciones",
  factura: "Facturas",
};

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // En el portal de ventas (/sales) reescribir las rutas /admin → /sales
  const enSales = location.pathname.startsWith("/sales");
  const rutaPortal = (ruta: string) =>
    enSales ? ruta.replace("/admin/sales", "/sales").replace(/^\/admin/, "/sales") : ruta;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atajo global Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("global-search:open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("global-search:open", onOpenEvent);
    };
  }, []);

  // Al abrir: enfocar y resetear
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await apiClient.get(`/search?q=${encodeURIComponent(q.trim())}`);
        setResults(r.data);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const irA = useCallback((res: SearchResult) => {
    setOpen(false);
    navigate(rutaPortal(res.ruta));
  }, [navigate, enSales]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); irA(results[active]); }
  };

  if (!open) return null;

  // Agrupar manteniendo el orden de aparición de tipos
  const grupos: { tipo: string; items: SearchResult[] }[] = [];
  for (const res of results) {
    let g = grupos.find((x) => x.tipo === res.tipo);
    if (!g) { g = { tipo: res.tipo, items: [] }; grupos.push(g); }
    g.items.push(res);
  }

  let flatIdx = -1;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Buscar vehículo (VIN/modelo), cliente, cotización #, factura…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
          />
          <span className={styles.kbd}>ESC</span>
        </div>

        <div className={styles.results}>
          {q.trim().length < 2 ? (
            <div className={styles.hint}>Escribe al menos 2 caracteres para buscar.</div>
          ) : loading ? (
            <div className={styles.empty}>Buscando…</div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>Sin resultados para “{q}”.</div>
          ) : (
            grupos.map((g) => (
              <div key={g.tipo}>
                <div className={styles.groupLabel}>{GROUP_LABEL[g.tipo] ?? g.tipo}</div>
                {g.items.map((res) => {
                  flatIdx++;
                  const idx = flatIdx;
                  return (
                    <div
                      key={`${res.tipo}-${res.id}`}
                      className={`${styles.item} ${idx === active ? styles.itemActive : ""}`}
                      onClick={() => irA(res)}
                      onMouseEnter={() => setActive(idx)}
                    >
                      <span className={styles.itemIcon}>{res.icono}</span>
                      <div className={styles.itemText}>
                        <span className={styles.itemTitle}>{res.titulo}</span>
                        <span className={styles.itemSub}>{res.subtitulo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>⌘/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
