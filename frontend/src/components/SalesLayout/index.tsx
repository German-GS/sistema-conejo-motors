import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import styles from "../AdminLayout/AdminLayout.module.css"; // Reutilizamos los estilos
import { jwtDecode } from "jwt-decode";
import conejoLogo from "../../img/Logos/Logo-Blanco.png";
import { LuLayoutDashboard, LuCar, LuFileText } from "react-icons/lu";

export const SalesLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decodedToken: { email: string } = jwtDecode(token);
      setUserEmail(decodedToken.email);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
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
        </nav>
      </aside>
      <div
        className={`${styles.mainPanel} ${
          isCollapsed ? styles.mainPanelCollapsed : ""
        }`}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>Portal de Ventas</div>
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
