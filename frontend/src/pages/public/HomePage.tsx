// src/pages/public/HomePage.tsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./HomePage.module.css";
import catalogStyles from "@/pages/admin/sales/CatalogPage/CatalogPage.module.css";

// --- INTERFACES ---
interface CarouselSlide {
  title: string;
  subtitle: string;
  imageUrl: string;
}
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  imagenes?: { url: string }[];
}
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(value);

export const HomePage = () => {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await apiClient.get("/site-settings/public");
        const slidesData = JSON.parse(
          settingsRes.data.find((s: any) => s.key === "carousel_slides")
            ?.value || "[]"
        );
        const featuredIds = JSON.parse(
          settingsRes.data.find((s: any) => s.key === "featured_vehicles")
            ?.value || "[]"
        );

        setSlides(slidesData);

        if (featuredIds.length > 0) {
          const vehiclePromises = featuredIds.map((id: number) =>
            apiClient.get(`/vehicles/${id}`)
          );
          const vehiclesRes = await Promise.all(vehiclePromises);
          setFeaturedVehicles(vehiclesRes.map((res) => res.data));
        }
      } catch (error) {
        console.error("Error al cargar datos de la página principal", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      const timer = setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, slides.length]);

  if (loading) return <p>Cargando página principal...</p>;

  return (
    <div className={styles.homeContainer}>
      {/* Carrusel */}
      {slides.length > 0 && (
        <div className={styles.carousel}>
          {slides.map((slide, index) => {
            const bgImage = slide.imageUrl
              ? `url(${apiClient.defaults.baseURL}/${slide.imageUrl})`
              : "none";

            return (
              <div
                key={index}
                className={`${styles.slide} ${
                  index === currentSlide ? styles.active : ""
                }`}
                style={{ backgroundImage: bgImage }}
              >
                <div className={styles.slideContent}>
                  <h1>{slide.title}</h1>
                  <p>{slide.subtitle}</p>
                  <Link to="/catalog" className={styles.carouselButton}>
                    Ver Modelos
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vehículos Destacados */}
      {featuredVehicles.length > 0 && (
        <div className={styles.featuredSection}>
          <h2>Vehículos Destacados</h2>
          {/* MODIFICACIÓN 1: Se usa la clase 'featuredGrid' para centrar todo el bloque de tarjetas. */}
          <div className={styles.featuredGrid}>
            {featuredVehicles.map((vehicle) => (
              <div key={vehicle.id} className={catalogStyles.vehicleCard}>
                <img
                  src={
                    vehicle.imagenes?.[0]
                      ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
                      : "/placeholder.png"
                  }
                  alt={`${vehicle.marca} ${vehicle.modelo}`}
                  className={catalogStyles.vehicleImage}
                />
                <div className={catalogStyles.vehicleInfo}>
                  <h3>
                    {vehicle.marca} {vehicle.modelo} ({vehicle.año})
                  </h3>
                  <p className={catalogStyles.price}>
                    {formatCurrency(vehicle.precio_venta)}
                  </p>
                  {/* MODIFICACIÓN 2: Se quita 'width: "100%"' del estilo para que el botón se centre correctamente. */}
                  <Link
                    to={`/catalog/${vehicle.id}`}
                    className="btn btn-principal"
                    style={{ marginTop: "auto" }}
                  >
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección Extra: Llamada a la Acción (Call to Action) */}
      <div className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>¿No puedes decidirte?</h2>
          <p>
            Usa nuestra herramienta de comparación para ver las características
            de hasta tres vehículos, lado a lado.
          </p>
          <Link to="/compare" className="btn btn-principal">
            Ir al Comparador
          </Link>
        </div>
      </div>
    </div>
  );
};
