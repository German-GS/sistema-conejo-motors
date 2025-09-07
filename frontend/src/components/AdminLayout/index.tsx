import { useState, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import styles from "./AdminLayout.module.css";
import { jwtDecode } from "jwt-decode";
import conejoLogo from "../../img/Logos/Logo-Blanco.png";
import {
  LuLayoutDashboard,
  LuCar,
  LuUsers,
  LuSettings,
  LuFileText,
  LuWarehouse,
  LuMapPin,
} from "react-icons/lu";

export const AdminLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decodedToken: { email: string; rol?: { nombre: string } } =
        jwtDecode(token);
      setUserEmail(decodedToken.email);
      setUserRole(decodedToken.rol?.nombre || ""); // 👈 2. Guardar el rol
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  };

  return (
    <div className={styles.layout}>
      <aside
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}
        onMouseEnter={() => setIsCollapsed(false)} // Se expande al entrar el mouse
        onMouseLeave={() => setIsCollapsed(true)} // Se colapsa al salir el mouse
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
            <LuWarehouse size={20} /> {/* O el ícono que prefieras */}
            {!isCollapsed && <span className={styles.linkText}>Bodegas</span>}
          </Link>
          <Link to="/admin/tracking">
            <LuMapPin size={20} /> {/* O el ícono que prefieras */}
            {!isCollapsed && <span className={styles.linkText}>Rastreo</span>}
          </Link>
          {userRole === "Administrador" && (
            <Link to="/admin/settings">
              <LuSettings size={20} />
              {!isCollapsed && (
                <span className={styles.linkText}>Configuración</span>
              )}
            </Link>
          )}
        </nav>

        {/* El botón de toggle ya no es necesario */}
      </aside>
      <div
        className={`${styles.mainPanel} ${
          isCollapsed ? styles.mainPanelCollapsed : ""
        }`}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>Panel de Control</div>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Cerrar Sesión
          </button>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
