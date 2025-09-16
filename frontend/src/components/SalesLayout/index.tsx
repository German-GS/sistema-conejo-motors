import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import styles from "../AdminLayout/AdminLayout.module.css"; // Reutilizamos los estilos
import apiClient from "@/api/apiClient"; // Necesitamos el apiClient
import { jwtDecode } from "jwt-decode";
import conejoLogo from "../../img/Logos/Logo-Blanco.png";
import { LuLayoutDashboard, LuCar, LuFileText, LuBell, LuContact } from "react-icons/lu";

// Interfaz para el objeto de notificación
interface Notification {
  id: number;
  message: string;
  link: string;
}

export const SalesLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
      const decodedToken: { email: string } = jwtDecode(token);
      setUserEmail(decodedToken.email);
    }

    // Buscamos notificaciones al cargar y luego cada minuto
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  const handleNotificationClick = async (notification: Notification) => {
    setShowNotifications(false);
    try {
      await apiClient.patch(`/notifications/${notification.id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
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
          {!isCollapsed && <span className={styles.logoText}>VENTAS</span>}
        </div>

        <div className={styles.userInfo}>
          {!isCollapsed && <span>{userEmail}</span>}
        </div>

        <nav className={styles.nav}>
          <Link to="/sales">
            <LuLayoutDashboard size={20} />
            {!isCollapsed && <span className={styles.linkText}>Dashboard</span>}
          </Link>
          <Link to="/sales/catalog">
            <LuCar size={20} />
            {!isCollapsed && <span className={styles.linkText}>Catálogo</span>}
          </Link>
          <Link to="/sales/quotes">
            <LuFileText size={20} />
            {!isCollapsed && (
              <span className={styles.linkText}>Cotizaciones</span>
            )}
          </Link>
          <Link to="/sales/leads">
    <LuContact size={20} />
    {!isCollapsed && (
      <span className={styles.linkText}>Leads</span>
    )}
  </Link>
        </nav>
      </aside>
      <div
        className={`${styles.mainPanel} ${
          isCollapsed ? styles.mainPanelCollapsed : ""
        }`}
      >
        {/* --- 👇 INICIO DE LA MODIFICACIÓN (4/4): Añadir campana en el header --- */}
        <header className={styles.header}>
          <div className={styles.headerTitle}>Portal de Ventas</div>
          <div className={styles.headerActions}>
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
            <button onClick={handleLogout} className={styles.logoutButton}>
              Cerrar Sesión
            </button>
          </div>
        </header>
        {/* --- 👆 FIN DE LA MODIFICACIÓN --- */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
