// src/components/PublicLayout/index.tsx
import { NavLink, Link, Outlet } from "react-router-dom";
import styles from "./PublicLayout.module.css";
import logo from "@/img/Logos/Logo-Conejo-Motors-Texto-al-lado.png";

export const PublicLayout = () => {
  return (
    <div className={styles.publicLayout}>
      <header className={styles.header}>
        <Link to="/">
          <img src={logo} alt="Conejo Motors" className={styles.logo} />
        </Link>
        <nav className={styles.nav}>
          {/* 👇 AQUÍ AÑADIMOS EL NUEVO ENLACE DE INICIO 👇 */}
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? styles.activeLink : "")}
            end // La propiedad 'end' asegura que solo esté activo en la página principal exacta
          >
            Inicio
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) => (isActive ? styles.activeLink : "")}
          >
            Modelos
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) => (isActive ? styles.activeLink : "")}
          >
            Comparador
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) => (isActive ? styles.activeLink : "")}
          >
            Contacto
          </NavLink>
        </nav>
        <Link to="/login" className="btn btn-secondary">
          Ingresar
        </Link>
      </header>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} Conejo Motors. Todos los derechos
          reservados.
        </p>
      </footer>
    </div>
  );
};
