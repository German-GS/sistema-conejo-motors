import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./CatalogPage.module.css"; // Crearemos este archivo a continuación

// Definimos la interfaz para el vehículo del catálogo (sin precio_costo)
interface CatalogVehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  precio_venta: number;
  precio_venta_final: number | null;
  descuento_porcentaje: number | null;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  imagenes?: { url: string }[];
  bodega?: { nombre: string };
}

const formatCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);

export const CatalogPage = () => {
  const [vehicles, setVehicles] = useState<CatalogVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation(); // 2. Obtiene la ubicación actual
  const basePath = location.pathname.startsWith("/admin")
    ? "/admin/sales"
    : "/sales";

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/vehicles/sales/catalog");
        setVehicles(response.data);
      } catch (err) {
        setError("No se pudo cargar el catálogo de vehículos.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  if (loading) return <p>Cargando catálogo...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div>
      <h1>Catálogo de Vehículos Disponibles</h1>
      <div className={styles.catalogGrid}>
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className={styles.vehicleCard}>
            <img
              src={
                vehicle.imagenes?.[0]
                  ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
                  : "URL_IMAGEN_POR_DEFECTO"
              }
              alt={`${vehicle.marca} ${vehicle.modelo}`}
              className={styles.vehicleImage}
            />
            <div className={styles.vehicleInfo}>
              <h3>
                {vehicle.marca} {vehicle.modelo} ({vehicle.año})
              </h3>
              <p className={styles.price}>
                {formatCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}
              </p>
              {vehicle.descuento_porcentaje ? (
                <p className={styles.discount}>🏷️ {vehicle.descuento_porcentaje}% dto · Antes: {formatCRC(Number(vehicle.precio_venta))}</p>
              ) : null}
              <div className={styles.specs}>
                <span>🔋 {vehicle.capacidad_bateria_kwh} kWh</span>
                <span>⚡️ {vehicle.potencia_hp} HP</span>
                <span>📍 {vehicle.bodega?.nombre || "N/A"}</span>
              </div>
              <Link
                to={`${basePath}/catalog/${vehicle.id}`}
                className="btn btn-principal"
              >
                Ver Detalles
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
