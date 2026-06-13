import { Link, useLocation } from "react-router-dom";

// Etiquetas legibles por segmento de ruta
const LABELS: Record<string, string> = {
  admin: "Inicio",
  sales: "Ventas",
  inventory: "Inventario",
  pricing: "Precios",
  accesorios: "Accesorios",
  importaciones: "Importaciones",
  import: "Importar Excel",
  catalog: "Catálogo",
  quotes: "Cotizaciones",
  leads: "Leads / CRM",
  agenda: "Agenda",
  users: "Colaboradores",
  planilla: "Planilla",
  asistencia: "Asistencia",
  solicitudes: "Solicitudes",
  productos: "Repuestos",
  proveedores: "Proveedores",
  gastos: "Gastos",
  cxc: "Cuentas x Cobrar",
  cxp: "Cuentas x Pagar",
  "caja-chica": "Caja Chica",
  tesoreria: "Tesorería",
  contabilidad: "Contabilidad",
  taller: "Taller",
  garantias: "Garantías",
  bodegas: "Bodegas",
  billing: "Facturación",
  tracking: "Rastreo",
  reports: "Informes",
  settings: "Configuración",
  quote: "Nueva cotización",
};

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
