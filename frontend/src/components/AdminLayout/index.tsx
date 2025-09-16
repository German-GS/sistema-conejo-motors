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
} from "react-icons/lu";

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

      // Solo buscamos notificaciones si es admin
      if (decodedToken.rol?.nombre === "Administrador") {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Refresca cada minuto
        return () => clearInterval(interval);
      }
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
          <Link to="/admin">
            <LuLayoutDashboard size={20} />
            {!isCollapsed && <span className={styles.linkText}>Dashboard</span>}
          </Link>

          <hr
            style={{ borderColor: "rgba(255,255,255,0.1)", margin: "1rem 0" }}
          />

          <Link to="/admin/sales/catalog">
            <LuBookMarked size={20} />
            {!isCollapsed && (
              <span className={styles.linkText}>Catálogo Ventas</span>
            )}
          </Link>
          <Link to="/admin/sales/quotes">
            <LuFileText size={20} />
            {!isCollapsed && (
              <span className={styles.linkText}>Cotizaciones</span>
            )}
          </Link>

          <hr
            style={{ borderColor: "rgba(255,255,255,0.1)", margin: "1rem 0" }}
          />

          <Link to="/admin/inventory">
            <LuCar size={20} />
            {!isCollapsed && (
              <span className={styles.linkText}>Inventario</span>
            )}
          </Link>
          <Link to="/admin/users">
            <LuUsers size={20} />
            {!isCollapsed && (
              <span className={styles.linkText}>Colaboradores</span>
            )}
          </Link>
          <Link to="/admin/planilla">
            <LuFileText size={20} />
            {!isCollapsed && <span className={styles.linkText}>Planilla</span>}
          </Link>
          <Link to="/admin/bodegas">
            <LuWarehouse size={20} />
            {!isCollapsed && <span className={styles.linkText}>Bodegas</span>}
          </Link>
          <Link to="/admin/billing">
        <LuReceipt size={20} />
        {!isCollapsed && <span className={styles.linkText}>Facturación</span>}
    </Link>
          <Link to="/admin/tracking">
            <LuMapPin size={20} />
            {!isCollapsed && <span className={styles.linkText}>Rastreo</span>}
          </Link>

          {/* CORRECCIÓN APLICADA AQUÍ */}
          {userRole === "Administrador" && (
            <>
              <Link to="/admin/reports">
                <LuChartColumnStacked size={20} />
                {!isCollapsed && (
                  <span className={styles.linkText}>Informes</span>
                )}
              </Link>
              <Link to="/admin/settings">
                <LuSettings size={20} />
                {!isCollapsed && (
                  <span className={styles.linkText}>Configuración</span>
                )}
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
    </div>
  );
};
