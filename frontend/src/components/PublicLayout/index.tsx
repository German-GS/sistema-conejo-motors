// src/components/PublicLayout/index.tsx
import { useState, useEffect } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import styles from "./PublicLayout.module.css";
import logo from "@/img/Logos/Logo-Conejo-Motors-Texto-al-lado.png";

export const PublicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Evitar scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" }), 300);
    } else {
      document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={styles.publicLayout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logoLink}>
          <img src={logo} alt="Conejo Motors" className={styles.logo} />
        </Link>

        {/* Nav escritorio */}
        <nav className={styles.nav}>
          <NavLink to="/" className={({ isActive }) => isActive ? styles.activeLink : ""} end>Inicio</NavLink>
          <NavLink to="/catalog" className={({ isActive }) => isActive ? styles.activeLink : ""}>Modelos</NavLink>
          <NavLink to="/compare" className={({ isActive }) => isActive ? styles.activeLink : ""}>Comparador</NavLink>
          <a href="#contacto" onClick={handleContactClick}>Contacto</a>
        </nav>

        <Link to="/login" className={`btn btn-secondary ${styles.ingresoBtn}`}>Ingresar</Link>

        {/* Botón hamburguesa */}
        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </header>

      {/* Overlay + menú móvil */}
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}
      <nav className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
        <NavLink to="/" className={({ isActive }) => isActive ? styles.mobileActiveLink : styles.mobileLink} end onClick={() => setMenuOpen(false)}>Inicio</NavLink>
        <NavLink to="/catalog" className={({ isActive }) => isActive ? styles.mobileActiveLink : styles.mobileLink} onClick={() => setMenuOpen(false)}>Modelos</NavLink>
        <NavLink to="/compare" className={({ isActive }) => isActive ? styles.mobileActiveLink : styles.mobileLink} onClick={() => setMenuOpen(false)}>Comparador</NavLink>
        <a href="#contacto" onClick={handleContactClick} className={styles.mobileLink}>Contacto</a>
        <Link to="/login" className={`btn btn-secondary ${styles.mobileBtnIngreso}`} onClick={() => setMenuOpen(false)}>Ingresar</Link>
      </nav>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Conejo Motors. Todos los derechos reservados.</p>
        <p className={styles.footerDev}>Desarrollado por German Garcia S.</p>
      </footer>
    </div>
  );
};
