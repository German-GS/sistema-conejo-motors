// src/pages/public/PublicCatalogPage.tsx
import { useState, useEffect } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "@/pages/admin/sales/CatalogPage/CatalogPage.module.css";
import stylesLayout from "@/components/PublicLayout/PublicLayout.module.css";
import logo from "@/img/Logos/Logo-Conejo-Motors-Texto-al-lado.png";

interface CatalogVehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  imagenes?: { url: string }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(value);
};

export const PublicCatalogPage = () => {
  const [vehicles, setVehicles] = useState<CatalogVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await apiClient.get("/vehicles/sales/catalog");
        setVehicles(response.data);
      } catch (err) {
        console.error("No se pudo cargar el catálogo de vehículos.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  if (loading) return <p>Cargando vehículos...</p>;

  return (
    <div className={styles.publicLayout}>
      <header className={styles.header}>
        <Link to="/">
          <img src={logo} alt="Conejo Motors" className={styles.logo} />
        </Link>
        <nav className={styles.nav}>
          {/* 2. Usamos NavLink y le añadimos una clase para el estado activo */}
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
