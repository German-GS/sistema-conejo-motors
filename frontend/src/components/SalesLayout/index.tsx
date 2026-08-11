import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "../AdminLayout/AdminLayout.module.css";
import apiClient from "@/api/apiClient";
import { jwtDecode } from "jwt-decode";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";
import conejoLogo from "../../img/Logos/Logo-Blanco.png";
import {
  LuLayoutDashboard, LuCar, LuFileText, LuBell, LuContact,
  LuCalendarClock, LuSearch, LuMenu, LuX, LuPin, LuPinOff,
} from "react-icons/lu";
import { ClockWidget } from "@/components/ClockWidget";
import { ChatWidget } from "@/components/ChatWidget";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface Notification { id: number; message: string; link: string; }

const NAV = [
  { to: "/sales", icon: <LuLayoutDashboard size={18} />, label: "Dashboard", end: true },
  { to: "/sales/catalog", icon: <LuCar size={18} />, label: "Catálogo" },
  { to: "/sales/quotes", icon: <LuFileText size={18} />, label: "Cotizaciones" },
  { to: "/sales/leads", icon: <LuContact size={18} />, label: "Leads" },
  { to: "/sales/asistencia", icon: <LuCalendarClock size={18} />, label: "Mi Asistencia" },
  { to: "/sales/solicitudes", icon: <LuFileText size={18} />, label: "Mis Solicitudes" },
];

export const SalesLayout = () => {
  useSessionKeepAlive();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem("sidebarPinned") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    setIsTablet(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => { if (isTablet) setMobileOpen(false); }, [location.pathname, isTablet]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get("/notifications/unread");
      setNotifications(response.data);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decoded: { email: string; rol?: { nombre: string } } = jwtDecode(token);
      setUserEmail(decoded.email);
      setEsAdmin(decoded.rol?.nombre === "Administrador");
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const togglePin = () => {
    setPinned(p => {
      const next = !p;
      try { localStorage.setItem("sidebarPinned", next ? "1" : "0"); } catch { /* ignorar */ }
      if (next) setIsCollapsed(false);
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  const handleNotificationClick = async (n: Notification) => {
    setShowNotifications(false);
    try {
      await apiClient.patch(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      const link = n.link || "/sales";
      const resolved = link.startsWith("/admin") || link.startsWith("/sales") ? link : `/sales${link}`;
      navigate(resolved);
    } catch { /* silencioso */ }
  };

  const colapsadoReal = isCollapsed && !pinned && !isTablet;
  const showLabels = isTablet ? true : (pinned || !isCollapsed);

  return (
    <div className={styles.layout}>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      {isTablet && mobileOpen && (
        <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`${styles.sidebar} ${colapsadoReal ? styles.collapsed : ""} ${isTablet && mobileOpen ? styles.mobileOpen : ""}`}
        onMouseEnter={() => { if (!isTablet && !pinned) setIsCollapsed(false); }}
        onMouseLeave={() => { if (!isTablet && !pinned) setIsCollapsed(true); }}
      >
        <div className={styles.logoContainer}>
          <img src={conejoLogo} alt="Logo" className={styles.logoImage} />
          {showLabels && <span className={styles.logoText}>VENTAS</span>}
          {showLabels && !isTablet && (
            <button
              onClick={togglePin}
              title={pinned ? "Desfijar menú" : "Fijar menú abierto"}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: pinned ? "#fff" : "rgba(255,255,255,0.5)", fontSize: "1rem", padding: 2 }}
            >
              {pinned ? <LuPin size={16} /> : <LuPinOff size={16} />}
            </button>
          )}
        </div>

        <div className={styles.userInfo}>
          {showLabels && <span>{userEmail}</span>}
        </div>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
              title={!showLabels ? item.label : undefined}
            >
              {item.icon}
              {showLabels && <span className={styles.linkText}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className={`${styles.mainPanel} ${colapsadoReal ? styles.mainPanelCollapsed : ""}`}>
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button className={styles.hamburger} onClick={() => setMobileOpen(v => !v)} aria-label="Abrir menú">
              {mobileOpen ? <LuX size={22} /> : <LuMenu size={22} />}
            </button>
            <div className={styles.headerTitle}>Portal de Ventas</div>
          </div>
          <div className={styles.headerActions}>
            {esAdmin && (
              <button
                onClick={() => navigate("/admin")}
                title="Volver al panel de administrador"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  background: "var(--brand)", border: "none", color: "#fff",
                  borderRadius: 8, padding: "0.45rem 0.85rem", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap",
                }}
              >
                ← Volver a Admin
              </button>
            )}
            <button
              onClick={() => window.dispatchEvent(new Event("global-search:open"))}
              title="Buscar (⌘/Ctrl + K)"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--slate-100)", border: "1px solid var(--slate-200)", borderRadius: 8, padding: "0.4rem 0.7rem", cursor: "pointer", color: "var(--slate-500)", fontSize: "0.85rem" }}
            >
              <LuSearch size={16} />
              <span>Buscar</span>
              <span style={{ fontSize: "0.7rem", border: "1px solid var(--slate-300)", borderRadius: 4, padding: "1px 5px", background: "#fff" }}>⌘K</span>
            </button>
            <ClockWidget />
            <div className={styles.notificationBell} onClick={() => setShowNotifications(!showNotifications)}>
              <LuBell size={24} />
              {notifications.length > 0 && <span className={styles.notificationBadge}>{notifications.length}</span>}
              {showNotifications && (
                <div className={styles.notificationDropdown}>
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className={styles.notificationItem}>
                        {n.message}
                      </div>
                    ))
                  ) : (
                    <div className={styles.notificationItem}>No hay notificaciones nuevas</div>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className={styles.logoutButton}>Cerrar Sesión</button>
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
