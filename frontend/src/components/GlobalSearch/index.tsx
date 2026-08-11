import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import apiClient from "@/api/apiClient";
import styles from "./GlobalSearch.module.css";
import { LuSearch } from "react-icons/lu";
import { buscarDestinos, type AdminDestination } from "@/nav/adminDestinations";

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

/**
 * Tope de páginas mostradas. Cuando el query nombra una sección del menú (ej. "compras",
 * "finanzas"), se listan todos sus destinos — algunas secciones tienen hasta 13 ítems
 * (Finanzas + su sub-hub de Contabilidad) — por eso el tope es más alto que para matches
 * de un solo destino.
 */
const MAX_PAGINAS = 15;

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
  const [userRole, setUserRole] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const tok = localStorage.getItem("accessToken");
      if (tok) {
        const d = jwtDecode<{ rol?: { nombre: string } }>(tok);
        setUserRole(d.rol?.nombre || "");
      }
    } catch { /* silencioso */ }
  }, []);

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

  // "Ir a" — páginas del panel que matchean por label/keywords, filtradas por rol.
  const paginas = useMemo<AdminDestination[]>(
    () => (q.trim().length >= 2 ? buscarDestinos(q, userRole).slice(0, MAX_PAGINAS) : []),
    [q, userRole],
  );

  // Búsqueda de datos (vehículos, clientes, cotizaciones, facturas) con debounce
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

  useEffect(() => { setActive(0); }, [paginas, results]);

  const irADato = useCallback((res: SearchResult) => {
    setOpen(false);
    navigate(rutaPortal(res.ruta));
  }, [navigate, enSales]);

  const irAPagina = useCallback((dest: AdminDestination) => {
    setOpen(false);
    navigate(rutaPortal(dest.ruta));
  }, [navigate, enSales]);

  // Lista plana para navegación con flechas: primero páginas, después datos.
  const totalItems = paginas.length + results.length;

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, totalItems - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active < paginas.length) {
        if (paginas[active]) irAPagina(paginas[active]);
      } else {
        const res = results[active - paginas.length];
        if (res) irADato(res);
      }
    }
  };

  if (!open) return null;

  // Agrupar los resultados de datos manteniendo el orden de aparición de tipos
  const grupos: { tipo: string; items: SearchResult[] }[] = [];
  for (const res of results) {
    let g = grupos.find((x) => x.tipo === res.tipo);
    if (!g) { g = { tipo: res.tipo, items: [] }; grupos.push(g); }
    g.items.push(res);
  }

  const sinResultados = q.trim().length >= 2 && !loading && paginas.length === 0 && results.length === 0;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <span className={styles.searchIcon}><LuSearch size={18} /></span>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Ir a una sección (ej: IVA, conciliación, ajustes) o buscar vehículo, cliente, cotización, factura…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
          />
          <span className={styles.kbd}>ESC</span>
        </div>

        <div className={styles.results}>
          {q.trim().length < 2 ? (
            <div className={styles.hint}>Escribe al menos 2 caracteres para buscar.</div>
          ) : loading && paginas.length === 0 ? (
            <div className={styles.empty}>Buscando…</div>
          ) : sinResultados ? (
            <div className={styles.empty}>Sin resultados para “{q}”.</div>
          ) : (
            <>
              {paginas.length > 0 && (
                <div>
                  <div className={styles.groupLabel}>Ir a</div>
                  {paginas.map((dest, i) => (
                    <div
                      key={dest.id}
                      className={`${styles.item} ${i === active ? styles.itemActive : ""}`}
                      onClick={() => irAPagina(dest)}
                      onMouseEnter={() => setActive(i)}
                    >
                      <span className={styles.itemIcon}><dest.icon size={18} /></span>
                      <div className={styles.itemText}>
                        <span className={styles.itemTitle}>{dest.label}</span>
                        {dest.descripcion && <span className={styles.itemSub}>{dest.descripcion}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {grupos.map((g) => (
                <div key={g.tipo}>
                  <div className={styles.groupLabel}>{GROUP_LABEL[g.tipo] ?? g.tipo}</div>
                  {g.items.map((res) => {
                    const idx = paginas.length + results.indexOf(res);
                    return (
                      <div
                        key={`${res.tipo}-${res.id}`}
                        className={`${styles.item} ${idx === active ? styles.itemActive : ""}`}
                        onClick={() => irADato(res)}
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
              ))}
            </>
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
