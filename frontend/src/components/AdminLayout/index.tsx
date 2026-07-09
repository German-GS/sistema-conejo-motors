import { useState, useEffect, useCallback } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "./AdminLayout.module.css";
import { jwtDecode } from "jwt-decode";
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
} from "react-icons/lu";
import { ClockWidget } from "@/components/ClockWidget";
import { ChatWidget } from "@/components/ChatWidget";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
  compras:      ["/admin/proveedores", "/admin/gastos"],
  finanzas:     ["/admin/finanzas", "/admin/cxc", "/admin/cxp", "/admin/caja-chica", "/admin/tesoreria", "/admin/contabilidad"],
  postventa:    ["/admin/taller", "/admin/garantias"],
  operaciones:  ["/admin/bodegas", "/admin/billing", "/admin/tracking"],
};

const STORAGE_KEY = "adminSidebarSections";

const getDefaultSections = (pathname: string): Set<string> => {
  // Si hay estado guardado, usarlo
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignorar */ }

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

  // Detectar tablet/móvil
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    setIsTablet(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
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

  // Al cambiar de ruta, asegurar que la sección activa esté abierta
  useEffect(() => {
    for (const [section, routes] of Object.entries(SECTION_ROUTES)) {
      if (routes.some(r => location.pathname.startsWith(r))) {
        setOpenSections(prev => {
          if (prev.has(section)) return prev;
          const next = new Set(prev);
          next.add(section);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignorar */ }
          return next;
        });
        break;
      }
    }
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
        {/* Logo */}
        <div className={styles.logoContainer}>
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
              {pinned ? "📌" : "📍"}
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

          {/* ── INVENTARIO ── */}
          <SectionHeader id="inventario" label="INVENTARIO" />
          {isOpen("inventario") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/inventory" icon={<LuCar size={18} />} label="Vehículos y precios" />
              <SidebarLink to="/admin/accesorios" icon={<LuPackage size={18} />} label="Accesorios" />
              <SidebarLink to="/admin/importaciones" icon={<LuShip size={18} />} label="Importaciones" />
              <SidebarLink to="/admin/import" icon={<LuUpload size={18} />} label="Importar Excel" />
            </div>
          )}

          {/* ── RRHH ── */}
          <SectionHeader id="rrhh" label="RRHH" />
          {isOpen("rrhh") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/users" icon={<LuUsers size={18} />} label="Colaboradores" />
              <SidebarLink to="/admin/planilla" icon={<LuFileText size={18} />} label="Planilla" />
              <SidebarLink to="/admin/asistencia" icon={<LuCalendarClock size={18} />} label="Asistencia" />
              <SidebarLink to="/admin/solicitudes" icon={<LuFileText size={18} />} label="Solicitudes" />
            </div>
          )}

          {/* ── REPUESTOS ── */}
          <SectionHeader id="repuestos" label="REPUESTOS" />
          {isOpen("repuestos") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/productos" icon={<LuShoppingCart size={18} />} label="Repuestos & Accesorios" />
            </div>
          )}

          {/* ── COMPRAS ── */}
          <SectionHeader id="compras" label="COMPRAS" />
          {isOpen("compras") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/proveedores" icon={<LuBuilding2 size={18} />} label="Proveedores" />
              <SidebarLink to="/admin/gastos" icon={<LuReceiptText size={18} />} label="Gastos" />
            </div>
          )}

          {/* ── FINANZAS Y CONTABILIDAD ── */}
          <SectionHeader id="finanzas" label="FINANZAS Y CONTABILIDAD" />
          {isOpen("finanzas") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/finanzas" icon={<LuWallet size={18} />} label="Resumen Financiero" />
              <SidebarLink to="/admin/cxc" icon={<LuTrendingUp size={18} />} label="Cuentas x Cobrar" />
              <SidebarLink to="/admin/cxp" icon={<LuTrendingDown size={18} />} label="Cuentas x Pagar" />
              <SidebarLink to="/admin/caja-chica" icon={<LuWallet size={18} />} label="Caja Chica" />
              <SidebarLink to="/admin/tesoreria" icon={<LuBanknote size={18} />} label="Tesorería" />
              {(userRole === "Administrador" || userRole === "Contador") && (
                <SidebarLink to="/admin/contabilidad" icon={<LuCalculator size={18} />} label="Contabilidad" />
              )}
            </div>
          )}

          {/* ── POSTVENTA ── */}
          <SectionHeader id="postventa" label="POSTVENTA" />
          {isOpen("postventa") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/taller" icon={<LuWrench size={18} />} label="Taller" />
              <SidebarLink to="/admin/garantias" icon={<LuShield size={18} />} label="Garantías" />
            </div>
          )}

          {/* ── OPERACIONES ── */}
          <SectionHeader id="operaciones" label="OPERACIONES" />
          {isOpen("operaciones") && (
            <div className={styles.sectionItems}>
              <SidebarLink to="/admin/bodegas" icon={<LuWarehouse size={18} />} label="Bodegas" />
              <SidebarLink to="/admin/billing" icon={<LuReceipt size={18} />} label="Facturación" />
              <SidebarLink to="/admin/tracking" icon={<LuMapPin size={18} />} label="Rastreo" />
            </div>
          )}
        </nav>

        {/* ── SISTEMA — fijo al fondo (solo admin) ── */}
        {userRole === "Administrador" && (
          <div className={styles.sidebarBottom}>
            <div className={styles.sectionLabelStatic}>
              {showLabels && <span>SISTEMA</span>}
            </div>
            <SidebarLink to="/admin/reports" icon={<LuChartColumnStacked size={18} />} label="Informes" />
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
                👁️ Ver como Vendedor
              </button>
            )}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      <ChatWidget />
      <GlobalSearch />
    </div>
  );
};
