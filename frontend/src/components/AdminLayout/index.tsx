import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
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
} from "react-icons/lu";
import { ClockWidget } from "@/components/ClockWidget";
import { ChatWidget } from "@/components/ChatWidget";

// Interfaz para el objeto de notificación
interface Notification {
  id: number;
  message: string;
  link: string;
}

export const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [overdueLeads, setOverdueLeads] = useState(0);
  const navigate = useNavigate();

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

      // Notificaciones solo para admin
      if (decodedToken.rol?.nombre === "Administrador") {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
      }

      // Follow-ups vencidos para todos los roles con acceso a leads
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
    setShowNotifications(false); // Cierra el dropdown primero
    try {
      // Marca como leída en el backend
      await apiClient.patch(`/notifications/${notification.id}/read`);
      // Actualiza el estado local para que desaparezca inmediatamente
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      // Navega al enlace de la notificación
      navigate(notification.link);
    } catch (error) {
      console.error("Error al marcar la notificación como leída", error);
    }
  };

  return (
    <div className={styles.layout}>
      <aside
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <div className={styles.logoContainer}>
          <img src={conejoLogo} alt="Logo" className={styles.logoImage} />
          {!isCollapsed && (
            <span className={styles.logoText}>CONEJO MOTORS</span>
          )}
        </div>

        <div className={styles.userInfo}>
          {!isCollapsed && <span>{userEmail}</span>}
        </div>

        <nav className={styles.nav}>
          {/* Dashboard */}
          <Link to="/admin">
            <LuLayoutDashboard size={18} />
            {!isCollapsed && <span className={styles.linkText}>Dashboard</span>}
          </Link>

          {/* ── VENTAS ── */}
          <div className={styles.sectionLabel}>Ventas</div>
          <Link to="/admin/sales/catalog">
            <LuBookMarked size={18} />
            {!isCollapsed && <span className={styles.linkText}>Catálogo</span>}
          </Link>
          <Link to="/admin/sales/quotes">
            <LuFileText size={18} />
            {!isCollapsed && <span className={styles.linkText}>Cotizaciones</span>}
          </Link>
          <Link to="/admin/leads">
            <LuUserCheck size={18} />
            {!isCollapsed && <span className={styles.linkText}>Leads / CRM</span>}
            {overdueLeads > 0 && (
              <span className={styles.menuBadge} title={`${overdueLeads} follow-up(s) vencidos`}>
                {overdueLeads}
              </span>
            )}
          </Link>
          <Link to="/admin/agenda">
            <LuCalendarDays size={18} />
            {!isCollapsed && <span className={styles.linkText}>Agenda</span>}
          </Link>

          {/* ── INVENTARIO ── */}
          <div className={styles.sectionLabel}>Inventario</div>
          <Link to="/admin/inventory">
            <LuCar size={18} />
            {!isCollapsed && <span className={styles.linkText}>Vehículos</span>}
          </Link>
          <Link to="/admin/pricing">
            <LuTag size={18} />
            {!isCollapsed && <span className={styles.linkText}>Precios</span>}
          </Link>
          <Link to="/admin/accesorios">
            <LuPackage size={18} />
            {!isCollapsed && <span className={styles.linkText}>Accesorios</span>}
          </Link>
          <Link to="/admin/importaciones">
            <LuShip size={18} />
            {!isCollapsed && <span className={styles.linkText}>Importaciones</span>}
          </Link>
          <Link to="/admin/import">
            <LuUpload size={18} />
            {!isCollapsed && <span className={styles.linkText}>Importar Excel</span>}
          </Link>

          {/* ── RRHH ── */}
          <div className={styles.sectionLabel}>RRHH</div>
          <Link to="/admin/users">
            <LuUsers size={18} />
            {!isCollapsed && <span className={styles.linkText}>Colaboradores</span>}
          </Link>
          <Link to="/admin/planilla">
            <LuFileText size={18} />
            {!isCollapsed && <span className={styles.linkText}>Planilla</span>}
          </Link>
          <Link to="/admin/asistencia">
            <LuCalendarClock size={18} />
            {!isCollapsed && <span className={styles.linkText}>Asistencia</span>}
          </Link>
          <Link to="/admin/solicitudes">
            <LuFileText size={18} />
            {!isCollapsed && <span className={styles.linkText}>Solicitudes</span>}
          </Link>

          {/* ── PRODUCTOS ── */}
          <div className={styles.sectionLabel}>Repuestos</div>
          <Link to="/admin/productos">
            <LuShoppingCart size={18} />
            {!isCollapsed && <span className={styles.linkText}>Repuestos & Accesorios</span>}
          </Link>

          {/* ── COMPRAS ── */}
          <div className={styles.sectionLabel}>Compras</div>
          <Link to="/admin/proveedores">
            <LuBuilding2 size={18} />
            {!isCollapsed && <span className={styles.linkText}>Proveedores</span>}
          </Link>
          <Link to="/admin/gastos">
            <LuReceiptText size={18} />
            {!isCollapsed && <span className={styles.linkText}>Gastos</span>}
          </Link>

          {/* ── FINANZAS ── */}
          <div className={styles.sectionLabel}>Finanzas</div>
          <Link to="/admin/cxc">
            <LuTrendingUp size={18} />
            {!isCollapsed && <span className={styles.linkText}>Cuentas x Cobrar</span>}
          </Link>
          <Link to="/admin/cxp">
            <LuTrendingDown size={18} />
            {!isCollapsed && <span className={styles.linkText}>Cuentas x Pagar</span>}
          </Link>
          <Link to="/admin/caja-chica">
            <LuWallet size={18} />
            {!isCollapsed && <span className={styles.linkText}>Caja Chica</span>}
          </Link>
          <Link to="/admin/tesoreria">
            <LuBanknote size={18} />
            {!isCollapsed && <span className={styles.linkText}>Tesorería</span>}
          </Link>

          {/* ── CONTABILIDAD ── */}
          <div className={styles.sectionLabel}>Contabilidad</div>
          <Link to="/admin/contabilidad">
            <LuCalculator size={18} />
            {!isCollapsed && <span className={styles.linkText}>Contabilidad</span>}
          </Link>

          {/* ── POSTVENTA ── */}
          <div className={styles.sectionLabel}>Postventa</div>
          <Link to="/admin/taller">
            <LuWrench size={18} />
            {!isCollapsed && <span className={styles.linkText}>Taller</span>}
          </Link>
          <Link to="/admin/garantias">
            <LuShield size={18} />
            {!isCollapsed && <span className={styles.linkText}>Garantías</span>}
          </Link>

          {/* ── OPERACIONES ── */}
          <div className={styles.sectionLabel}>Operaciones</div>
          <Link to="/admin/bodegas">
            <LuWarehouse size={18} />
            {!isCollapsed && <span className={styles.linkText}>Bodegas</span>}
          </Link>
          <Link to="/admin/billing">
            <LuReceipt size={18} />
            {!isCollapsed && <span className={styles.linkText}>Facturación</span>}
          </Link>
          <Link to="/admin/tracking">
            <LuMapPin size={18} />
            {!isCollapsed && <span className={styles.linkText}>Rastreo</span>}
          </Link>

          {/* ── SISTEMA (solo admin) ── */}
          {userRole === "Administrador" && (
            <>
              <div className={styles.sectionLabel}>Sistema</div>
              <Link to="/admin/reports">
                <LuChartColumnStacked size={18} />
                {!isCollapsed && <span className={styles.linkText}>Informes</span>}
              </Link>
              <Link to="/admin/settings">
                <LuSettings size={18} />
                {!isCollapsed && <span className={styles.linkText}>Configuración</span>}
              </Link>
            </>
          )}
        </nav>
      </aside>

      <div
        className={`${styles.mainPanel} ${
          isCollapsed ? styles.mainPanelCollapsed : ""
        }`}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>Panel de Control</div>
          <div className={styles.headerActions}>
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
            <button onClick={handleLogout} className={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <ChatWidget />
    </div>
  );
};
