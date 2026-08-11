import { useState, useEffect, useCallback, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "./AdminLayout.module.css";
import { jwtDecode } from "jwt-decode";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";
import apiClient from "@/api/apiClient";
import conejoLogo from "../../img/Logos/Logo-Blanco.png";
import {
  LuChevronDown, LuMenu, LuX, LuPin, LuEye, LuBell, LuSearch, LuStar, LuClock,
  LuLayoutDashboard, LuCalculator,
} from "react-icons/lu";
import {
  ADMIN_SECTIONS, ADMIN_DESTINATIONS, DESTINO_POR_RUTA, puedeVerDestino,
  type AdminDestination,
} from "@/nav/adminDestinations";
import { ClockWidget } from "@/components/ClockWidget";
import { ChatWidget } from "@/components/ChatWidget";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Interfaz para el objeto de notificación
interface Notification {
  id: number;
  message: string;
  link: string;
}

/** Rutas del sub-hub "Contabilidad" anidado dentro de Finanzas. Al entrar por una de
 *  estas rutas se abre tanto "finanzas" (padre) como "finanzas-contab" (el sub-hub). */
const CONTAB_SUBHUB_ROUTES = ADMIN_DESTINATIONS
  .filter((d) => d.subseccion === "contab")
  .map((d) => d.ruta);

const STORAGE_KEY = "adminSidebarSections";
const FAVORITOS_KEY = "adminFavorites";
const RECIENTES_KEY = "adminRecientes";
const MAX_RECIENTES = 5;

// Destinos agrupados por sección (excluye Dashboard y Sistema, que se renderizan aparte).
const DESTINOS_POR_SECCION: Record<string, AdminDestination[]> = {};
for (const d of ADMIN_DESTINATIONS) {
  if (d.seccion === "_top" || d.seccion === "sistema") continue;
  (DESTINOS_POR_SECCION[d.seccion] ??= []).push(d);
}
const DESTINOS_SISTEMA = ADMIN_DESTINATIONS.filter((d) => d.seccion === "sistema");
/** Etiqueta e icono de cada sub-hub anidado (hoy solo existe "contabilidad" dentro de Finanzas). */
const SUBHUB_LABELS: Record<string, string> = { contab: "Contabilidad" };
const SUBHUB_ICONS: Record<string, React.ComponentType<{ size?: number }>> = { contab: LuCalculator };

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
  for (const [seccion, destinos] of Object.entries(DESTINOS_POR_SECCION)) {
    if (destinos.some(d => pathname.startsWith(d.ruta))) {
      return new Set([seccion]);
    }
  }
  // Por defecto: ventas e inventario abiertas
  return new Set(["ventas", "inventario", "favoritos", "recientes"]);
};

const leerListaGuardada = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
  const [openSections, setOpenSections] = useState<Set<string>>(() =>
    getDefaultSections(window.location.pathname)
  );
  const [favoritos, setFavoritos] = useState<string[]>(() => leerListaGuardada(FAVORITOS_KEY));
  const [recientes, setRecientes] = useState<string[]>(() => leerListaGuardada(RECIENTES_KEY));
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
      for (const [seccion, destinos] of Object.entries(DESTINOS_POR_SECCION)) {
        if (destinos.some(d => location.pathname.startsWith(d.ruta))) {
          abrir.push(seccion);
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

  // Recientes: registra la página actual (si coincide con un destino conocido) al navegar.
  useEffect(() => {
    const dest = DESTINO_POR_RUTA[location.pathname];
    if (!dest) return;
    setRecientes(prev => {
      const next = [dest.id, ...prev.filter(id => id !== dest.id)].slice(0, MAX_RECIENTES + 1);
      try { localStorage.setItem(RECIENTES_KEY, JSON.stringify(next)); } catch { /* ignorar */ }
      return next;
    });
  }, [location.pathname]);

  const toggleFavorito = useCallback((id: string) => {
    setFavoritos(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(next)); } catch { /* ignorar */ }
      return next;
    });
  }, []);

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
      const link = notification.link || "/admin";
      const resolved = link.startsWith("/admin") || link.startsWith("/sales") ? link : `/admin${link}`;
      navigate(resolved);
    } catch (error) {
      console.error("Error al marcar la notificación como leída", error);
    }
  };

  // Destinos visibles para este rol, memoizados por sección.
  const visiblesPorSeccion = useMemo(() => {
    const out: Record<string, AdminDestination[]> = {};
    for (const [seccion, destinos] of Object.entries(DESTINOS_POR_SECCION)) {
      out[seccion] = destinos.filter(d => puedeVerDestino(d, userRole));
    }
    return out;
  }, [userRole]);

  const destinosFavoritos = useMemo(
    () => favoritos.map(id => ADMIN_DESTINATIONS.find(d => d.id === id)).filter(Boolean) as AdminDestination[],
    [favoritos],
  );
  const currentDestId = DESTINO_POR_RUTA[location.pathname]?.id;
  const destinosRecientes = useMemo(
    () => recientes
      .filter(id => id !== currentDestId)
      .slice(0, MAX_RECIENTES)
      .map(id => ADMIN_DESTINATIONS.find(d => d.id === id))
      .filter(Boolean) as AdminDestination[],
    [recientes, currentDestId],
  );

  // Helper: renderiza un encabezado de sección colapsable
  const SectionHeader = ({ id, label, icon }: { id: string; label: string; icon?: React.ReactNode }) => (
    <button
      className={`${styles.sectionLabel} ${openSections.has(id) ? styles.sectionOpen : ""}`}
      onClick={() => toggleSection(id)}
      title={!showLabels ? label : undefined}
    >
      {showLabels && (
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {icon}{label}
        </span>
      )}
      {showLabels && (
        <LuChevronDown
          size={12}
          className={`${styles.chevron} ${openSections.has(id) ? styles.chevronOpen : ""}`}
        />
      )}
    </button>
  );

  // Helper: NavLink con estilos activos. `hint` es un tooltip aclaratorio (siempre visible
  // al hacer hover, incluso con el sidebar expandido) para destinos con nombres parecidos.
  const SidebarLink = ({
    to, icon, iconSize = 18, label, hint, badge, favId,
  }: {
    to: string; icon: React.ReactNode; iconSize?: number; label: string; hint?: string;
    badge?: number; favId?: string;
  }) => {
    const esFavorito = favId ? favoritos.includes(favId) : false;
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
        }
        title={!showLabels ? label : hint}
      >
        {icon}
        {showLabels && <span className={styles.linkText}>{label}</span>}
        {badge && badge > 0 && (
          <span className={styles.menuBadge} title={`${badge} follow-up(s) vencidos`}>
            {badge}
          </span>
        )}
        {showLabels && favId && (
          <button
            type="button"
            className={styles.favToggle}
            style={esFavorito ? { opacity: 1, color: "#fbbf24" } : undefined}
            title={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorito(favId); }}
          >
            <LuStar size={13} fill={esFavorito ? "currentColor" : "none"} />
          </button>
        )}
      </NavLink>
    );
  };

  // Helper: renderiza los ítems planos de una sección (sin sub-hub)
  const renderDestinos = (destinos: AdminDestination[]) => destinos.map((d) => (
    <SidebarLink
      key={d.id}
      to={d.ruta}
      icon={<d.icon size={d.iconSize ?? 18} />}
      iconSize={d.iconSize}
      label={d.label}
      hint={d.descripcion}
      favId={d.id}
    />
  ));

  return (
    <div className={styles.layout}>
      {/* Bloquear sistema.conejomotors.com de Google */}
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

          {/* ── FAVORITOS ── */}
          {destinosFavoritos.length > 0 && (
            <>
              <SectionHeader id="favoritos" label="FAVORITOS" icon={<LuStar size={12} />} />
              {isOpen("favoritos") && (
                <div className={styles.sectionItems}>{renderDestinos(destinosFavoritos)}</div>
              )}
            </>
          )}

          {/* ── RECIENTES ── */}
          {destinosRecientes.length > 0 && (
            <>
              <SectionHeader id="recientes" label="RECIENTES" icon={<LuClock size={12} />} />
              {isOpen("recientes") && (
                <div className={styles.sectionItems}>{renderDestinos(destinosRecientes)}</div>
              )}
            </>
          )}

          {ADMIN_SECTIONS.filter(s => s.id !== "sistema").map((seccion) => {
            const destinos = visiblesPorSeccion[seccion.id] ?? [];
            if (destinos.length === 0) return null;
            const principales = destinos.filter(d => !d.subseccion);
            const subhubs = new Map<string, AdminDestination[]>();
            for (const d of destinos) {
              if (!d.subseccion) continue;
              if (!subhubs.has(d.subseccion)) subhubs.set(d.subseccion, []);
              subhubs.get(d.subseccion)!.push(d);
            }
            return (
              <div key={seccion.id}>
                <SectionHeader id={seccion.id} label={seccion.label.toUpperCase()} />
                {isOpen(seccion.id) && (
                  <div className={styles.sectionItems}>
                    {renderDestinos(principales)}
                    {[...subhubs.entries()].map(([subId, items]) => {
                      const SubIcon = SUBHUB_ICONS[subId] ?? LuCalculator;
                      return (
                      <div key={subId}>
                        <button
                          type="button"
                          className={styles.subGroupToggle}
                          onClick={() => toggleSection(`${seccion.id}-${subId}`)}
                          title={!showLabels ? SUBHUB_LABELS[subId] ?? subId : undefined}
                        >
                          <SubIcon size={18} />
                          {showLabels && <span>{SUBHUB_LABELS[subId] ?? subId}</span>}
                          {showLabels && (
                            <LuChevronDown
                              size={12}
                              className={`${styles.chevron} ${openSections.has(`${seccion.id}-${subId}`) ? styles.chevronOpen : ""}`}
                            />
                          )}
                        </button>
                        {(colapsadoReal || openSections.has(`${seccion.id}-${subId}`)) && (
                          <div className={styles.subGroupItems}>
                            {renderDestinos(items)}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── SISTEMA — fijo al fondo ── */}
        {DESTINOS_SISTEMA.some(d => puedeVerDestino(d, userRole)) && (
          <div className={styles.sidebarBottom}>
            <div className={styles.sectionLabelStatic}>
              {showLabels && <span>SISTEMA</span>}
            </div>
            {renderDestinos(DESTINOS_SISTEMA.filter(d => puedeVerDestino(d, userRole)))}
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
              title="Buscar o ir a una sección (⌘/Ctrl + K)"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "var(--slate-100)", border: "1px solid var(--slate-200)", borderRadius: 8,
                padding: "0.4rem 0.7rem", cursor: "pointer", color: "var(--slate-500)", fontSize: "0.85rem",
              }}
            >
              <LuSearch size={16} />
              <span>Buscar o ir a…</span>
              <span style={{ fontSize: "0.7rem", border: "1px solid var(--slate-300)", borderRadius: 4, padding: "1px 5px", background: "#fff" }}>⌘K</span>
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
                  background: "#fff", border: "1.5px solid var(--brand)", color: "var(--brand)",
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
