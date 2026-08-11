// src/nav/adminDestinations.ts
//
// Única fuente de verdad de la navegación del panel admin: el sidebar (AdminLayout),
// el command palette (GlobalSearch, ⌘K) y los breadcrumbs leen de acá para no
// desincronizarse nunca. Agregar una pantalla nueva = agregar una entrada acá.
import type { IconType } from "react-icons";
import {
  LuLayoutDashboard, LuCar, LuUsers, LuSettings, LuFileText, LuWarehouse, LuMapPin,
  LuBookMarked, LuChartColumnStacked, LuUpload, LuPackage, LuUserCheck, LuCalendarClock,
  LuCalculator, LuCalendarDays, LuBuilding2, LuTrendingDown, LuTrendingUp, LuWallet,
  LuWrench, LuShield, LuBanknote, LuShip, LuMegaphone, LuTriangleAlert, LuFileCheck,
  LuReceipt, LuScale, LuDollarSign, LuClipboardList, LuLandmark, LuBadgeDollarSign,
  LuInbox, LuPiggyBank, LuPackage2, LuCreditCard, LuUserRound, LuChartPie, LuFileSpreadsheet,
} from "react-icons/lu";

export interface AdminSection {
  id: string;
  label: string;
  /** Roles que ven la sección. Ausente = todos los roles. */
  roles?: string[];
}

/** Secciones de primer nivel del sidebar, en orden de aparición. */
export const ADMIN_SECTIONS: AdminSection[] = [
  { id: "ventas",      label: "Ventas",      roles: ["Administrador", "Vendedor"] },
  { id: "inventario",  label: "Inventario",  roles: ["Administrador", "Vendedor"] },
  { id: "compras",     label: "Compras",     roles: ["Administrador", "Contador"] },
  { id: "finanzas",    label: "Finanzas",    roles: ["Administrador", "Contador"] },
  { id: "rrhh",        label: "RRHH",        roles: ["Administrador"] },
  { id: "postventa",   label: "Postventa",   roles: ["Administrador", "Vendedor"] },
  { id: "operaciones", label: "Operaciones", roles: ["Administrador", "Vendedor", "Contador"] },
  { id: "sistema",     label: "Sistema",     roles: ["Administrador", "Contador"] },
];

export interface AdminDestination {
  id: string;
  label: string;
  ruta: string;
  icon: IconType;
  /** Tamaño sugerido del icono en el sidebar (18 = nivel 1, 16 = sub-hub). */
  iconSize?: number;
  seccion: string;
  /** Si pertenece a un sub-hub anidado (ej. "contabilidad" dentro de "finanzas"). */
  subseccion?: string;
  /** Roles que pueden ver este destino. Ausente = hereda el de la sección. */
  roles?: string[];
  /** Sinónimos/errores comunes para el command palette (⌘K). */
  keywords?: string[];
  /** Tooltip aclaratorio para destinos con nombres parecidos (Informes/Reportes/Estados). */
  descripcion?: string;
}

export const ADMIN_DESTINATIONS: AdminDestination[] = [
  // ── Fuera de toda sección: Dashboard ──
  { id: "dashboard", label: "Dashboard", ruta: "/admin", icon: LuLayoutDashboard, seccion: "_top",
    keywords: ["inicio", "home", "panel"] },

  // ── VENTAS ──
  { id: "catalogo", label: "Catálogo", ruta: "/admin/sales/catalog", icon: LuBookMarked, seccion: "ventas",
    keywords: ["vehiculos disponibles", "catalogo publico"] },
  { id: "cotizaciones", label: "Cotizaciones", ruta: "/admin/sales/quotes", icon: LuFileText, seccion: "ventas",
    keywords: ["cotizacion", "proforma", "presupuesto"] },
  { id: "leads", label: "Leads / CRM", ruta: "/admin/leads", icon: LuUserCheck, seccion: "ventas",
    keywords: ["crm", "prospectos", "seguimiento"] },
  { id: "clientes", label: "Clientes", ruta: "/admin/clientes", icon: LuUserRound, seccion: "ventas",
    keywords: ["cliente", "expediente", "sugef"] },
  { id: "campanas", label: "Campañas", ruta: "/admin/campanas", icon: LuMegaphone, seccion: "ventas",
    keywords: ["marketing", "facebook", "instagram", "tiktok", "publicidad"] },
  { id: "agenda", label: "Agenda", ruta: "/admin/agenda", icon: LuCalendarDays, seccion: "ventas",
    keywords: ["citas", "calendario", "reuniones"] },

  // ── INVENTARIO ──
  { id: "inventory", label: "Vehículos y precios", ruta: "/admin/inventory", icon: LuCar, seccion: "inventario",
    keywords: ["vehiculo", "precio", "vin", "stock"] },
  { id: "accesorios", label: "Accesorios de vehículo", ruta: "/admin/accesorios", icon: LuPackage, seccion: "inventario",
    keywords: ["accesorio", "extras vehiculo"] },
  { id: "repuestos", label: "Repuestos", ruta: "/admin/productos", icon: LuPackage2, seccion: "inventario",
    keywords: ["repuesto", "productos", "taller repuestos"],
    descripcion: "Repuestos y accesorios para venta general (no ligados a un vehículo del inventario)." },
  { id: "importaciones", label: "Importaciones", ruta: "/admin/importaciones", icon: LuShip, seccion: "inventario",
    keywords: ["importacion", "aduana", "embarque"] },
  { id: "import", label: "Importar Excel", ruta: "/admin/import", icon: LuUpload, seccion: "inventario",
    keywords: ["excel", "carga en bloque", "importar vehiculos"] },

  // ── COMPRAS ──
  { id: "proveedores", label: "Proveedores", ruta: "/admin/proveedores", icon: LuBuilding2, seccion: "compras",
    keywords: ["proveedor", "supplier"] },
  { id: "ordenes-compra", label: "Órdenes de Compra", ruta: "/admin/compras", icon: LuClipboardList, seccion: "compras",
    keywords: ["orden de compra", "oc", "compra"] },
  { id: "gastos", label: "Gastos", ruta: "/admin/gastos", icon: LuCreditCard, seccion: "compras",
    keywords: ["gasto", "factura de gasto", "comprobante"] },

  // ── FINANZAS (nivel 1) ──
  { id: "resumen-financiero", label: "Resumen Financiero", ruta: "/admin/finanzas", icon: LuWallet, seccion: "finanzas",
    keywords: ["resumen", "dashboard financiero", "salud financiera"] },
  { id: "cxc", label: "Cuentas x Cobrar", ruta: "/admin/cxc", icon: LuTrendingUp, seccion: "finanzas",
    keywords: ["cxc", "por cobrar", "cobranza"] },
  { id: "cxp", label: "Cuentas x Pagar", ruta: "/admin/cxp", icon: LuTrendingDown, seccion: "finanzas",
    keywords: ["cxp", "por pagar", "deudas"] },
  { id: "caja-chica", label: "Caja Chica", ruta: "/admin/caja-chica", icon: LuPiggyBank, seccion: "finanzas",
    keywords: ["caja chica", "efectivo"] },
  { id: "tesoreria", label: "Tesorería", ruta: "/admin/tesoreria", icon: LuBanknote, seccion: "finanzas",
    keywords: ["tesoreria", "flujo de caja", "bancos"] },

  // ── FINANZAS → sub-hub CONTABILIDAD ──
  { id: "contabilidad", label: "Libro / Asientos", ruta: "/admin/contabilidad", icon: LuCalculator, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["asientos", "libro diario", "libro mayor", "partida doble", "plan de cuentas"] },
  { id: "conciliacion", label: "Conciliación Bancaria", ruta: "/admin/conciliacion", icon: LuScale, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["banco", "bancaria", "concili", "extracto"] },
  { id: "multimoneda", label: "Multimoneda (USD)", ruta: "/admin/multimoneda", icon: LuDollarSign, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["multimoneda", "dolares", "tipo de cambio", "diferencial cambiario"] },
  { id: "obligaciones", label: "Obligaciones (IVA)", ruta: "/admin/obligaciones", icon: LuLandmark, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["iva", "impuesto", "d104", "d-104", "hacienda", "tribu-cr"] },
  { id: "estados-financieros", label: "Estados Financieros", ruta: "/admin/estados-financieros", icon: LuChartColumnStacked, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["balance", "resultados", "p&l", "situacion financiera", "estado de resultados"],
    descripcion: "Balance general y estado de resultados (P&L)." },
  { id: "reportes-contables", label: "Reportes Contables", ruta: "/admin/reportes-contables", icon: LuFileSpreadsheet, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["balanza de comprobacion", "mayor", "diario", "aging", "reportes"],
    descripcion: "Balanza de comprobación, libro mayor, libro diario y aging de cuentas." },
  { id: "pendientes-contables", label: "Pendientes Contab.", ruta: "/admin/pendientes-contables", icon: LuTriangleAlert, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["pendientes", "por contabilizar", "alertas contables"] },
  { id: "facturacion-electronica", label: "Facturación Electrónica", ruta: "/admin/facturacion-electronica", icon: LuFileCheck, seccion: "finanzas",
    subseccion: "contab", iconSize: 16,
    keywords: ["hacienda", "comprobante electronico", "tribu-cr", "xml", "clave numerica"],
    descripcion: "Comprobantes electrónicos ante Hacienda (TRIBU-CR) — no confundir con Facturación de ventas." },

  // ── RRHH ──
  { id: "users", label: "Colaboradores", ruta: "/admin/users", icon: LuUsers, seccion: "rrhh",
    keywords: ["empleados", "usuarios", "colaborador"] },
  { id: "planilla", label: "Planilla", ruta: "/admin/planilla", icon: LuBadgeDollarSign, seccion: "rrhh",
    keywords: ["planilla", "nomina", "salarios", "ccss"] },
  { id: "asistencia", label: "Asistencia", ruta: "/admin/asistencia", icon: LuCalendarClock, seccion: "rrhh",
    keywords: ["entrada", "salida", "marcaje", "asistencia"] },
  { id: "solicitudes", label: "Solicitudes", ruta: "/admin/solicitudes", icon: LuInbox, seccion: "rrhh",
    keywords: ["vacaciones", "permiso", "solicitud"] },

  // ── POSTVENTA ──
  { id: "taller", label: "Taller", ruta: "/admin/taller", icon: LuWrench, seccion: "postventa",
    keywords: ["servicio", "mantenimiento", "orden de trabajo"] },
  { id: "garantias", label: "Garantías", ruta: "/admin/garantias", icon: LuShield, seccion: "postventa",
    keywords: ["garantia", "reclamo"] },

  // ── OPERACIONES ──
  { id: "bodegas", label: "Bodegas", ruta: "/admin/bodegas", icon: LuWarehouse, seccion: "operaciones",
    keywords: ["bodega", "almacen"] },
  { id: "billing", label: "Facturación de ventas", ruta: "/admin/billing", icon: LuReceipt, seccion: "operaciones",
    keywords: ["facturar venta", "facturacion pendiente", "cerrar venta"],
    descripcion: "Facturar ventas de vehículos ya cotizadas — no confundir con Facturación Electrónica (Hacienda)." },
  { id: "tracking", label: "Rastreo", ruta: "/admin/tracking", icon: LuMapPin, seccion: "operaciones",
    keywords: ["gps", "rastreo", "ubicacion vehiculo"] },

  // ── SISTEMA ──
  { id: "reports", label: "Informes", ruta: "/admin/reports", icon: LuChartPie, seccion: "sistema",
    roles: ["Administrador"],
    keywords: ["informes gerenciales", "ventas por vendedor", "desempeño"],
    descripcion: "Informes gerenciales de ventas y desempeño del equipo." },
  { id: "settings", label: "Configuración", ruta: "/admin/settings", icon: LuSettings, seccion: "sistema",
    keywords: ["ajustes", "configuracion", "emisor", "depreciacion", "seguridad", "passkey"] },
];

/** Destino por ruta exacta (usado por Breadcrumbs para traducir slugs). */
export const DESTINO_POR_RUTA: Record<string, AdminDestination> =
  Object.fromEntries(ADMIN_DESTINATIONS.map((d) => [d.ruta, d]));

/** ¿Puede este rol ver este destino? Sin roles definidos = todos. */
export function puedeVerDestino(destino: AdminDestination, rol: string): boolean {
  if (!rol) return true; // token aún no decodificado: no ocultar (evita parpadeo)
  const roles = destino.roles ?? ADMIN_SECTIONS.find((s) => s.id === destino.seccion)?.roles;
  return !roles || roles.includes(rol);
}

/** Búsqueda simple por label/keywords, case/acento-insensible. */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** ¿El texto matchea el query? Bidireccional (para tolerar singular/plural, ej. "compra" vs
 *  "compras") pero solo en reversa cuando el texto es lo bastante largo, para no generar
 *  falsos positivos con keywords cortos (ej. "oc", "iva"). */
function matchTexto(texto: string, q: string): boolean {
  const t = normalizar(texto);
  if (t.includes(q)) return true;
  return t.length >= 3 && q.includes(t);
}

export function buscarDestinos(query: string, rol: string): AdminDestination[] {
  const q = normalizar(query.trim());
  if (!q) return [];
  const visibles = ADMIN_DESTINATIONS.filter((d) => d.seccion !== "_top" && puedeVerDestino(d, rol));

  // 1) Si el query nombra una SECCIÓN del menú (ej. "inventario", "compras"), mostrar todo
  //    lo que contiene esa sección — así se puede "entrar" a un grupo escribiendo su nombre.
  const seccion = ADMIN_SECTIONS.find((s) => matchTexto(s.label, q));
  if (seccion) {
    const enSeccion = visibles.filter((d) => d.seccion === seccion.id);
    if (enSeccion.length > 0) return enSeccion;
  }

  // 2) Si no, búsqueda normal por label/keywords de cada destino.
  return visibles
    .filter((d) => matchTexto(d.label, q) || (d.keywords ?? []).some((k) => matchTexto(k, q)))
    // Prioriza coincidencias que empiezan por el query en el label.
    .sort((a, b) => {
      const aStarts = normalizar(a.label).startsWith(q) ? 0 : 1;
      const bStarts = normalizar(b.label).startsWith(q) ? 0 : 1;
      return aStarts - bStarts;
    });
}
