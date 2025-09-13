// src/pages/public/PublicCatalogPage.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "@/pages/admin/sales/CatalogPage/CatalogPage.module.css";
import stylesLayout from "@/components/PublicLayout/PublicLayout.module.css";

// Ampliamos la interfaz para asegurarnos de tener la categoría
interface CatalogVehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  imagenes?: { url: string }[];
  categoria?: string; // Es opcional por si algún vehículo no la tiene
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(value);
};

export const PublicCatalogPage = () => {
  // Estado para guardar los vehículos agrupados por categoría
  const [groupedVehicles, setGroupedVehicles] = useState<{
    [key: string]: CatalogVehicle[];
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndGroupVehicles = async () => {
      try {
        const response = await apiClient.get<CatalogVehicle[]>(
          "/vehicles/sales/catalog"
        );

        // --- Lógica para agrupar los vehículos ---
        const groups = response.data.reduce((acc, vehicle) => {
          const category = vehicle.categoria || "Sin Categoría"; // Agrupa los no clasificados
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(vehicle);
          return acc;
        }, {} as { [key: string]: CatalogVehicle[] });

        setGroupedVehicles(groups);
      } catch (err) {
        console.error("No se pudo cargar el catálogo de vehículos.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAndGroupVehicles();
  }, []);

  if (loading) return <p>Cargando vehículos...</p>;

  return (
    <div className={stylesLayout.pageContainer}>
      <h1 style={{ textAlign: "center", marginBottom: "3rem" }}>
        Nuestros Modelos
      </h1>

      {/* Iteramos sobre cada grupo de vehículos */}
      {Object.entries(groupedVehicles).map(([category, vehicles]) => (
        <section key={category} className={styles.categorySection}>
          {/* Título de la categoría */}
          <h2 className={styles.categoryTitle}>{category}</h2>

          <div className={styles.catalogGrid}>
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className={styles.vehicleCard}>
                <img
                  src={
                    vehicle.imagenes?.[0]
                      ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
                      : "/placeholder.png"
                  }
                  alt={`${vehicle.marca} ${vehicle.modelo}`}
                  className={styles.vehicleImage}
                />
                <div className={styles.vehicleInfo}>
                  <h3>
                    {vehicle.marca} {vehicle.modelo} ({vehicle.año})
                  </h3>
                  <p className={styles.price}>
                    {formatCurrency(vehicle.precio_venta)}
                  </p>
                  <Link
                    to={`/catalog/${vehicle.id}`}
                    className="btn btn-principal"
                    style={{ marginTop: "auto" }}
                  >
                    Ver Ficha Técnica
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
