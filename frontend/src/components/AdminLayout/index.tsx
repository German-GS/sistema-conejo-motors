import { useState, useEffect, useCallback } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "./AdminLayout.module.css";
import { jwtDecode } from "jwt-decode";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";
import apiClient from "@/api/apiClient";
import conejoLogo from "../../img/Logos/Logo-Blanco.png";
import {
  LuLayoutDashboard,
  LuCar,
  LuUsers,
  LuSettings,
  LuFileText,
  LuWarehouse,
  LuMapPin,
  LuBookMarked,
  LuChartColumnStacked,
  LuBell,
  LuReceipt,
  LuUpload,
  LuPackage,
  LuTag,
  LuUserCheck,
  LuCalendarClock,
  LuShoppingCart,
  LuCalculator,
  LuCalendarDays,
  LuBuilding2,
  LuTrendingDown,
  LuTrendingUp,
  LuWallet,
  LuReceiptText,
  LuWrench,
  LuShield,
  LuBanknote,
  LuShip,
  LuChevronDown,
  LuMenu,
  LuX,
  LuMegaphone,
  LuTriangleAlert,
  LuFileCheck,
  LuPin,
  LuEye,
} from "react-icons/lu";
import { ClockWidget } from "@/components/ClockWidget";
import { ChatWidget } from "@/components/ChatWidget";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LuSearch } from "react-icons/lu";

// Interfaz para el objeto de notificación
interface Notification {
  id: number;
  message: string;
  link: string;
}

// Secciones del menú con sus rutas para detectar cuál abrir automáticamente
const SECTION_ROUTES: Record<string, string[]> = {
  ventas:       ["/admin/sales", "/admin/leads", "/admin/clientes", "/admin/campanas", "/admin/agenda"],
  inventario:   ["/admin/inventory", "/admin/pricing", "/admin/accesorios", "/admin/importaciones", "/admin/import"],
  rrhh:         ["/admin/users", "/admin/planilla", "/admin/asistencia", "/admin/solicitudes"],
  repuestos:    ["/admin/productos"],
  compras:      ["/admin/proveedores", "/admin/gastos", "/admin/compras"],
  finanzas:     ["/admin/finanzas", "/admin/cxc", "/admin/cxp", "/admin/caja-chica", "/admin/tesoreria"],
  postventa:    ["/admin/taller", "/admin/garantias"],
  operaciones:  ["/admin/bodegas", "/admin/billing", "/admin/tracking"],
};

/** Rutas del sub-hub "Contabilidad" anidado dentro de Finanzas. Al entrar por una de
 *  estas rutas se abre tanto "finanzas" (padre) como "finanzas-contab" (el sub-hub). */
const CONTAB_SUBHUB_ROUTES = [
  "/admin/conciliacion", "/admin/multimoneda", "/admin/contabilidad", "/admin/obligaciones",
  "/admin/estados-financieros", "/admin/reportes-contables", "/admin/pendientes-contables",
  "/admin/facturacion-electronica",
];

const STORAGE_KEY = "adminSidebarSections";

/**
 * Roles que ven cada sección del menú. Es solo filtrado de UI — la protección real
 * de cada endpoint ya existe en el backend (RolesGuard); esto evita mostrar enlaces
 * que el rol no puede usar, para que el menú sea corto y relevante por rol.
 */
const SECTION_ROLES: Record<string, string[]> = {
  ventas:      ["Administrador", "Vendedor"],
  inventario:  ["Administrador", "Vendedor"],
  rrhh:        ["Administrador"],
  repuestos:   ["Administrador", "Vendedor"],
  compras:     ["Administrador", "Contador"],
  finanzas:    ["Administrador", "Contador"],
  postventa:   ["Administrador", "Vendedor"],
  operaciones: ["Administrador", "Vendedor", "Contador"],
};
// Si el rol aún no cargó (fracción de segundo tras montar), no ocultar nada — evita el
// parpadeo de "menú vacío" mientras se decodifica el token.
const puedeVerSeccion = (id: string, rol: string) =>
  !rol || !SECTION_ROLES[id] || SECTION_ROLES[id].includes(rol);

const getDefaultSections = (pathname: string): Set<string> => {
  // Si hay estado guardado, usarlo
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignorar */ }

  // Sub-hub de Contabilidad: abre "finanzas" (padre) + "finanzas-contab" (el sub-hub)
  if (CONTAB_SUBHUB_ROUTES.some(r => pathname.startsWith(r))) {
    return new Set(["finanzas", "finanzas-contab"]);
  }

  // Si no, abrir la sección que contiene la ruta actual
  for (const [section, routes] of Object.entries(SECTION_ROUTES)) {
    if (routes.some(r => pathname.startsWith(r))) {
      return new Set([section]);
    }
  }
  // Por defecto: ventas e inventario abiertas
  return new Set(["ventas", "inventario"]);
};

export const AdminLayout = () => {
  useSessionKeepAlive();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem("sidebarPinned") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [overdueLeads, setOverdueLeads] = useState(0);
  const [openSections, setOpenSections] = useState<Set<string>>(() =>
    getDefaultSections(window.location.pathname)
  );
  const navigate = useNavigate();
  const location = useLocation();

  // Detectar tablet/táctil: por ancho (≤1280px, sube desde 1024 para cubrir tablets
  // grandes/iPad horizontal) O por tipo de puntero (pointer: coarse). La causa raíz del
  // bug era que un iPad horizontal (~1024–1194px de ancho) caía en modo "escritorio" y
  // el menú solo se expandía con hover — que un dedo no dispara. Con pointer:coarse
  // detectamos cualquier pantalla táctil sin importar el ancho, y se usa tap en vez de hover.
  useEffect(() => {
    const mqWidth = window.matchMedia("(max-width: 1280px)");
    const mqTouch = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTablet(mqWidth.matches || mqTouch.matches);
    update();
    mqWidth.addEventListener("change", update);
    mqTouch.addEventListener("change", update);
    return () => {
      mqWidth.removeEventListener("change", update);
      mqTouch.removeEventListener("change", update);
    };
  }, []);

  // Cerrar sidebar al navegar en tablet
  useEffect(() => {
    if (isTablet) setMobileOpen(false);
  }, [location.pathname, isTablet]);

  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      // Persistir en localStorage
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignorar */ }
      return next;
    });
  }, []);

  // Al cambiar de ruta, asegurar que la sección activa (y el sub-hub de Contabilidad,
  // si aplica) esté abierta.
  useEffect(() => {
    const abrir: string[] = [];
    if (CONTAB_SUBHUB_ROUTES.some(r => location.pathname.startsWith(r))) {
      abrir.push("finanzas", "finanzas-contab");
    } else {
      for (const [section, routes] of Object.entries(SECTION_ROUTES)) {
        if (routes.some(r => location.pathname.startsWith(r))) {
          abrir.push(section);
          break;
        }
      }
    }
    if (!abrir.length) return;
    setOpenSections(prev => {
      if (abrir.every(s => prev.has(s))) return prev;
      const next = new Set(prev);
      abrir.forEach(s => next.add(s));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignorar */ }
      return next;
    });
  }, [location.pathname]);

  const togglePin = () => {
    setPinned(p => {
      const next = !p;
      try { localStorage.setItem("sidebarPinned", next ? "1" : "0"); } catch { /* ignorar */ }
      if (next) setIsCollapsed(false);
      return next;
    });
  };

  // El sidebar está colapsado solo si NO está fijado, no es tablet y el mouse no está encima
  const colapsadoReal = isCollapsed && !pinned && !isTablet;
  // En tablet o fijado siempre mostrar etiquetas
  const showLabels = isTablet ? true : (pinned || !isCollapsed);
  const isOpen = (section: string) => (colapsadoReal) || openSections.has(section);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get("/notifications/unread");
      setNotifications(response.data);
    } catch (error) {
      console.error("Error al cargar notificaciones", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decodedToken: { email: string; rol?: { nombre: string } } =
        jwtDecode(token);
      setUserEmail(decodedToken.email);
      setUserRole(decodedToken.rol?.nombre || "");

      if (decodedToken.rol?.nombre === "Administrador") {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
      }

      const fetchOverdue = () => {
        apiClient.get("/leads/followup/overdue-count")
          .then((res) => setOverdueLeads(res.data.count))
          .catch(() => {});
      };
      fetchOverdue();
      const overdueInterval = setInterval(fetchOverdue, 120000);
      return () => clearInterval(overdueInterval);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  };

  const handleNotificationClick = async (notification: Notification) => {
    setShowNotifications(false);
    try {
      await apiClient.patch(`/notifications/${notification.id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      // Resolver el link: si no tiene prefijo /admin o /sales, añadir /admin
      const link = notification.link || "/admin";
      const resolved = link.startsWith("/admin") || link.startsWith("/sales") ? link : `/admin${link}`;
      navigate(resolved);
    } catch (error) {
      console.error("Error al marcar la notificación como leída", error);
    }
  };

  // Helper: renderiza un encabezado de sección colapsable
  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      className={`${styles.sectionLabel} ${openSections.has(id) ? styles.sectionOpen : ""}`}
      onClick={() => toggleSection(id)}
      title={!showLabels ? label : undefined}
    >
      {showLabels && <span>{label}</span>}
      {showLabels && (
        <LuChevronDown
          size={12}
          className={`${styles.chevron} ${openSections.has(id) ? styles.chevronOpen : ""}`}
        />
      )}
    </button>
  );

  // Helper: NavLink con estilos activos
  const SidebarLink = ({
    to,
    icon,
    label,
    badge,
  }: {
    to: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
      }
      title={!showLabels ? label : undefined}
    >
      {icon}
      {showLabels && <span className={styles.linkText}>{label}</span>}
      {badge && badge > 0 && (
        <span className={styles.menuBadge} title={`${badge} follow-up(s) vencidos`}>
          {badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className={styles.layout}>
      {/* Tarea 2: Bloquear sistema.conejomotors.com de Google */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Backdrop para tablet */}
      {isTablet && mobileOpen && (
        <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`${styles.sidebar} ${colapsadoReal ? styles.collapsed : ""} ${isTablet && mobileOpen ? styles.mobileOpen : ""}`}
        onMouseEnter={() => { if (!isTablet && !pinned) setIsCollapsed(false); }}
        onMouseLeave={() => { if (!isTablet && !pinned) setIsCollapsed(true); }}
      >
        {/* Logo — en táctil, tocarlo también abre/cierra el drawer */}
        <div
          className={styles.logoContainer}
          onClick={isTablet ? () => setMobileOpen(v => !v) : undefined}
          style={isTablet ? { cursor: "pointer" } : undefined}
        >
          <img src={conejoLogo} alt="Logo" className={styles.logoImage} />
          {showLabels && <span className={styles.logoText}>CONEJO MOTORS</span>}
          {showLabels && !isTablet && (
            <button
              onClick={togglePin}
              title={pinned ? "Desfijar menú" : "Fijar menú abierto"}
              style={{
                marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
                color: pinned ? "#fff" : "rgba(255,255,255,0.5)", fontSize: "1rem", padding: 2,
              }}
            >
              {pinned ? <LuPin size={16} /> : <LuPin size={16} style={{ opacity: 0.6 }} />}
            </button>
          )}
        </div>

        {/* Usuario */}
        <div className={styles.userInfo}>
          {showLabels && <span>{userEmail}</span>}
        </div>

        {/* Nav scrollable */}
        <nav className={styles.nav}>
          {/* Dashboard */}
          <SidebarLink to="/admin" icon={<LuLayoutDashboard size={18} />} label="Dashboard" />

          {/* ── VENTAS ── */}
          {puedeVerSeccion("ventas", userRole) && (
            <>
              <SectionHeader id="ventas" label="VENTAS" />
              {isOpen("ventas") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/sales/catalog" icon={<LuBookMarked size={18} />} label="Catálogo" />
                  <SidebarLink to="/admin/sales/quotes" icon={<LuFileText size={18} />} label="Cotizaciones" />
                  <SidebarLink to="/admin/leads" icon={<LuUserCheck size={18} />} label="Leads / CRM" />
                  <SidebarLink to="/admin/clientes" icon={<LuUsers size={18} />} label="Clientes" />
                  <SidebarLink to="/admin/campanas" icon={<LuMegaphone size={18} />} label="Campañas" />
                  <SidebarLink to="/admin/agenda" icon={<LuCalendarDays size={18} />} label="Agenda" />
                </div>
              )}
            </>
          )}

          {/* ── INVENTARIO ── */}
          {puedeVerSeccion("inventario", userRole) && (
            <>
              <SectionHeader id="inventario" label="INVENTARIO" />
              {isOpen("inventario") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/inventory" icon={<LuCar size={18} />} label="Vehículos y precios" />
                  <SidebarLink to="/admin/accesorios" icon={<LuPackage size={18} />} label="Accesorios" />
                  <SidebarLink to="/admin/importaciones" icon={<LuShip size={18} />} label="Importaciones" />
                  <SidebarLink to="/admin/import" icon={<LuUpload size={18} />} label="Importar Excel" />
                </div>
              )}
            </>
          )}

          {/* ── RRHH ── */}
          {puedeVerSeccion("rrhh", userRole) && (
            <>
              <SectionHeader id="rrhh" label="RRHH" />
              {isOpen("rrhh") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/users" icon={<LuUsers size={18} />} label="Colaboradores" />
                  <SidebarLink to="/admin/planilla" icon={<LuFileText size={18} />} label="Planilla" />
                  <SidebarLink to="/admin/asistencia" icon={<LuCalendarClock size={18} />} label="Asistencia" />
                  <SidebarLink to="/admin/solicitudes" icon={<LuFileText size={18} />} label="Solicitudes" />
                </div>
              )}
            </>
          )}

          {/* ── REPUESTOS ── */}
          {puedeVerSeccion("repuestos", userRole) && (
            <>
              <SectionHeader id="repuestos" label="REPUESTOS" />
              {isOpen("repuestos") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/productos" icon={<LuShoppingCart size={18} />} label="Repuestos & Accesorios" />
                </div>
              )}
            </>
          )}

          {/* ── COMPRAS ── */}
          {puedeVerSeccion("compras", userRole) && (
            <>
              <SectionHeader id="compras" label="COMPRAS" />
              {isOpen("compras") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/proveedores" icon={<LuBuilding2 size={18} />} label="Proveedores" />
                  <SidebarLink to="/admin/compras" icon={<LuReceiptText size={18} />} label="Órdenes de Compra" />
                  <SidebarLink to="/admin/gastos" icon={<LuReceiptText size={18} />} label="Gastos" />
                </div>
              )}
            </>
          )}

          {/* ── FINANZAS Y CONTABILIDAD ──
              Sub-hub: los enlaces puramente contables quedan anidados bajo "Contabilidad"
              (mismo componente, mismas rutas — solo se agrupan visualmente). */}
          {puedeVerSeccion("finanzas", userRole) && (
            <>
              <SectionHeader id="finanzas" label="FINANZAS Y CONTABILIDAD" />
              {isOpen("finanzas") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/finanzas" icon={<LuWallet size={18} />} label="Resumen Financiero" />
                  <SidebarLink to="/admin/cxc" icon={<LuTrendingUp size={18} />} label="Cuentas x Cobrar" />
                  <SidebarLink to="/admin/cxp" icon={<LuTrendingDown size={18} />} label="Cuentas x Pagar" />
                  <SidebarLink to="/admin/caja-chica" icon={<LuWallet size={18} />} label="Caja Chica" />
                  <SidebarLink to="/admin/tesoreria" icon={<LuBanknote size={18} />} label="Tesorería" />

                  <button
                    type="button"
                    className={styles.subGroupToggle}
                    onClick={() => toggleSection("finanzas-contab")}
                    title={!showLabels ? "Contabilidad" : undefined}
                  >
                    <LuCalculator size={18} />
                    {showLabels && <span>Contabilidad</span>}
                    {showLabels && (
                      <LuChevronDown
                        size={12}
                        className={`${styles.chevron} ${openSections.has("finanzas-contab") ? styles.chevronOpen : ""}`}
                      />
                    )}
                  </button>
                  {(colapsadoReal || openSections.has("finanzas-contab")) && (
                    <div className={styles.subGroupItems}>
                      <SidebarLink to="/admin/contabilidad" icon={<LuCalculator size={16} />} label="Libro / Asientos" />
                      <SidebarLink to="/admin/conciliacion" icon={<LuBanknote size={16} />} label="Conciliación Bancaria" />
                      <SidebarLink to="/admin/multimoneda" icon={<LuBanknote size={16} />} label="Multimoneda (USD)" />
                      <SidebarLink to="/admin/obligaciones" icon={<LuReceiptText size={16} />} label="Obligaciones (IVA)" />
                      <SidebarLink to="/admin/estados-financieros" icon={<LuChartColumnStacked size={16} />} label="Estados Financieros" />
                      <SidebarLink to="/admin/reportes-contables" icon={<LuBookMarked size={16} />} label="Reportes Contables" />
                      <SidebarLink to="/admin/pendientes-contables" icon={<LuTriangleAlert size={16} />} label="Pendientes Contab." />
                      <SidebarLink to="/admin/facturacion-electronica" icon={<LuFileCheck size={16} />} label="Facturación Electrónica" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── POSTVENTA ── */}
          {puedeVerSeccion("postventa", userRole) && (
            <>
              <SectionHeader id="postventa" label="POSTVENTA" />
              {isOpen("postventa") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/taller" icon={<LuWrench size={18} />} label="Taller" />
                  <SidebarLink to="/admin/garantias" icon={<LuShield size={18} />} label="Garantías" />
                </div>
              )}
            </>
          )}

          {/* ── OPERACIONES ── */}
          {puedeVerSeccion("operaciones", userRole) && (
            <>
              <SectionHeader id="operaciones" label="OPERACIONES" />
              {isOpen("operaciones") && (
                <div className={styles.sectionItems}>
                  <SidebarLink to="/admin/bodegas" icon={<LuWarehouse size={18} />} label="Bodegas" />
                  <SidebarLink to="/admin/billing" icon={<LuReceipt size={18} />} label="Facturación" />
                  <SidebarLink to="/admin/tracking" icon={<LuMapPin size={18} />} label="Rastreo" />
                </div>
              )}
            </>
          )}
        </nav>

        {/* ── SISTEMA — fijo al fondo ── */}
        {(userRole === "Administrador" || userRole === "Contador") && (
          <div className={styles.sidebarBottom}>
            <div className={styles.sectionLabelStatic}>
              {showLabels && <span>SISTEMA</span>}
            </div>
            {userRole === "Administrador" && (
              <SidebarLink to="/admin/reports" icon={<LuChartColumnStacked size={18} />} label="Informes" />
            )}
            {/* Configuración: Admin ve todo; Contador ve solo la sección de Seguridad (passkeys). */}
            <SidebarLink to="/admin/settings" icon={<LuSettings size={18} />} label="Configuración" />
          </div>
        )}
      </aside>

      <div
        className={`${styles.mainPanel} ${colapsadoReal ? styles.mainPanelCollapsed : ""}`}
      >
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              className={styles.hamburger}
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? <LuX size={22} /> : <LuMenu size={22} />}
            </button>
            <div className={styles.headerTitle}>Panel de Control</div>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => window.dispatchEvent(new Event("global-search:open"))}
              title="Buscar (⌘/Ctrl + K)"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "0.4rem 0.7rem", cursor: "pointer", color: "#64748b", fontSize: "0.85rem",
              }}
            >
              <LuSearch size={16} />
              <span style={{ }}>Buscar</span>
              <span style={{ fontSize: "0.7rem", border: "1px solid #cbd5e1", borderRadius: 4, padding: "1px 5px", background: "#fff" }}>⌘K</span>
            </button>
            <ClockWidget />
            {userRole === "Administrador" && (
              <div
                className={styles.notificationBell}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <LuBell size={24} />
                {notifications.length > 0 && (
                  <span className={styles.notificationBadge}>
                    {notifications.length}
                  </span>
                )}
                {showNotifications && (
                  <div className={styles.notificationDropdown}>
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={styles.notificationItem}
                        >
                          {n.message}
                        </div>
                      ))
                    ) : (
                      <div className={styles.notificationItem}>
                        No hay notificaciones nuevas
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {userRole === "Administrador" && (
              <button
                onClick={() => navigate("/sales")}
                title="Previsualizar el sistema como lo ve un vendedor"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  background: "#fff", border: "1.5px solid #024f7d", color: "#024f7d",
                  borderRadius: 8, padding: "0.45rem 0.85rem", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap",
                }}
              >
                <LuEye size={16} /> Ver como Vendedor
              </button>
            )}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Breadcrumbs />
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ChatWidget />
      <GlobalSearch />
    </div>
  );
};
