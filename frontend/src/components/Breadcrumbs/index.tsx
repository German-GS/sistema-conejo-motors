import { Link, useLocation } from "react-router-dom";
import { ADMIN_DESTINATIONS } from "@/nav/adminDestinations";

// Etiquetas derivadas del último segmento de la ruta de cada destino del panel admin
// (adminDestinations.ts es la única fuente de verdad — así el breadcrumb nunca queda
// desactualizado cuando se agrega o renombra una pantalla).
const LABELS_DERIVADAS: Record<string, string> = Object.fromEntries(
  ADMIN_DESTINATIONS.map((d) => {
    const segs = d.ruta.split("/").filter(Boolean);
    return [segs[segs.length - 1], d.label];
  }),
);

// Segmentos estructurales (prefijos de sección o rutas dinámicas) que no son, en sí
// mismos, un destino del menú — se traducen a mano.
const LABELS_MANUALES: Record<string, string> = {
  admin: "Inicio",
  sales: "Ventas",
  quote: "Nueva cotización",
  compare: "Comparar",
  pricing: "Precios",
};

const LABELS: Record<string, string> = { ...LABELS_DERIVADAS, ...LABELS_MANUALES };

const linkPathFor = (segments: string[], idx: number) => "/" + segments.slice(0, idx + 1).join("/");

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  // Solo en el panel admin/sales y si hay más de un nivel
  if (segments.length <= 1) return null;

  return (
    <nav
      aria-label="breadcrumb"
      style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "1rem" }}
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const esNumero = /^\d+$/.test(seg);
        const label = esNumero ? `#${seg}` : (LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1));
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {i > 0 && <span style={{ opacity: 0.6 }}>›</span>}
            {isLast ? (
              <span style={{ color: "#475569", fontWeight: 600 }}>{label}</span>
            ) : (
              <Link to={linkPathFor(segments, i)} style={{ color: "#94a3b8", textDecoration: "none" }}>
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};
