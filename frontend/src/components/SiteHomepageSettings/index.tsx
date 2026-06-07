// src/components/SiteHomepageSettings/index.tsx
import React, { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import { getImageUrl } from "@/utils/imageUrl";
import toast from "react-hot-toast";
import styles from "./SiteHomepageSettings.module.css";
import { Card } from "@/components/Card";

// --- INTERFACES ---
interface Setting {
  key: string;
  value: string;
}

interface CarouselSlide {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  file?: File; // Para nuevas imágenes
}

interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
}

export const SiteHomepageSettings = () => {
  // --- ESTADOS ---
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [featuredVehicleIds, setFeaturedVehicleIds] = useState<Set<number>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  // --- EFECTOS ---
  useEffect(() => {
    setLoading(true); // Ponemos el estado de carga

    const loadInitialData = async () => {
      try {
        // 1. Hacemos ambas peticiones al mismo tiempo
        const [settingsRes, vehiclesRes] = await Promise.all([
          apiClient.get("/site-settings/public"), // Usamos /public por si acaso
          apiClient.get("/vehicles"), // Obtenemos TODOS los vehículos
        ]);

        // 2. Procesamos los vehículos PRIMERO
        const allVehiclesData: Vehicle[] = vehiclesRes.data;
        setAllVehicles(allVehiclesData);
        // Creamos un Set (mapa) de todos los IDs que SÍ existen
        const existingVehicleIds = new Set(allVehiclesData.map((v) => v.id));

        // 3. Procesamos los settings
        const settings: Setting[] = settingsRes.data;
        const slidesSetting = settings.find((s) => s.key === "carousel_slides");
        const featuredSetting = settings.find(
          (s) => s.key === "featured_vehicles"
        );

        if (slidesSetting) {
          setCarouselSlides(JSON.parse(slidesSetting.value || "[]"));
        }

        if (featuredSetting) {
          // 4. Obtenemos la lista "sucia" de IDs desde la BD
          const dirtyIds: number[] = JSON.parse(featuredSetting.value || "[]");

          // 5. LIMPIEZA: Filtramos la lista sucia y nos quedamos solo
          //    con los IDs que SÍ existen en 'existingVehicleIds'.
          const cleanIds = dirtyIds.filter((id) => existingVehicleIds.has(id));

          // 6. Iniciamos el estado SÓLO con los IDs limpios
          setFeaturedVehicleIds(new Set(cleanIds));
        }
      } catch (error) {
        // Usamos setTimeout para evitar el error de renderizado si falla
        setTimeout(() => {
          toast.error("No se pudo cargar la configuración o los vehículos.");
        }, 0);
      } finally {
        setLoading(false); // Quitamos el estado de carga
      }
    };

    loadInitialData();
  }, []);

  // --- MANEJADORES ---
  const handleAddSlide = () => {
    setCarouselSlides((prev) => [
      ...prev,
      {
        id: Date.now(), // ID temporal
        title: "Nuevo Título",
        subtitle: "Nueva descripción",
        imageUrl: "",
      },
    ]);
  };

  const handleRemoveSlide = (id: number) => {
    setCarouselSlides((prev) => prev.filter((slide) => slide.id !== id));
  };

  const handleSlideChange = (
    id: number,
    field: "title" | "subtitle",
    value: string
  ) => {
    setCarouselSlides((prev) =>
      prev.map((slide) =>
        slide.id === id ? { ...slide, [field]: value } : slide
      )
    );
  };

  const handleFileChange = (id: number, file: File) => {
    setCarouselSlides((prev) =>
      prev.map((slide) =>
        slide.id === id
          ? { ...slide, file, imageUrl: URL.createObjectURL(file) } // Muestra preview
          : slide
      )
    );
  };

  const handleFeaturedVehicleChange = (vehicleId: number) => {
    const currentSet = featuredVehicleIds;
    const isAdding = !currentSet.has(vehicleId);
    const isAtLimit = currentSet.size >= 3;

    // 1. Si intenta AÑADIR y YA está en el límite
    if (isAdding && isAtLimit) {
      // 2. Muestra el toast
      toast("Puedes seleccionar un máximo de 3 vehículos.", {
        icon: "⚠️",
      });
      // 3. Y no hace nada más
      return;
    }

    // 4. Si no, actualiza el estado
    setFeaturedVehicleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      // 1. Subir nuevas imágenes si las hay
      const uploadPromises = carouselSlides
        .filter((slide) => slide.file)
        .map(async (slide) => {
          const formData = new FormData();
          formData.append("files", slide.file!); // 'files' porque el backend espera un array
          const res = await apiClient.post(
            `/site-settings/upload`,
            formData
          );
          // Reemplazamos la URL temporal por la definitiva del backend
          slide.imageUrl = res.data[0].url;
          return slide;
        });

      await Promise.all(uploadPromises);

      // 2. Preparar los datos para guardar
      const finalSlides = carouselSlides.map(
        ({ id, title, subtitle, imageUrl }) => ({
          id,
          title,
          subtitle,
          imageUrl,
        })
      );

      const settingsToUpdate = [
        {
          key: "carousel_slides",
          value: JSON.stringify(finalSlides),
        },
        {
          key: "featured_vehicles",
          value: JSON.stringify(Array.from(featuredVehicleIds)),
        },
      ];

      // 3. Guardar la configuración
      await apiClient.patch("/site-settings", { settings: settingsToUpdate });
      toast.success("¡Configuración de la página guardada!");
    } catch (error) {
      toast.error("Error al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card title="Configuración de Página Principal">
        <p>Cargando configuración y vehículos...</p>
      </Card>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sección del Carrusel */}
      <div className={styles.section}>
        <h3>Carrusel Principal</h3>
        {carouselSlides.map((slide) => (
          <div key={slide.id} className={styles.slideEditor}>
            <img
              src={
                slide.imageUrl.startsWith("blob:")
                  ? slide.imageUrl
                  : getImageUrl(slide.imageUrl)
              }
              alt={slide.title}
              className={styles.slidePreview}
            />
            <div className={styles.slideInputs}>
              <input
                type="text"
                value={slide.title}
                onChange={(e) =>
                  handleSlideChange(slide.id, "title", e.target.value)
                }
                placeholder="Título"
              />
              <input
                type="text"
                value={slide.subtitle}
                onChange={(e) =>
                  handleSlideChange(slide.id, "subtitle", e.target.value)
                }
                placeholder="Subtítulo"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files &&
                  handleFileChange(slide.id, e.target.files[0])
                }
              />
            </div>
            <button
              onClick={() => handleRemoveSlide(slide.id)}
              className="btn btn-danger"
            >
              X
            </button>
          </div>
        ))}
        <button onClick={handleAddSlide} className="btn btn-secondary">
          + Añadir Slide
        </button>
      </div>

      {/* Sección de Vehículos Destacados */}
      <div className={styles.section}>
        <h3>Vehículos Destacados (Selecciona 3)</h3>
        <div className={styles.vehicleGrid}>
          {allVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`${styles.vehicleCheckbox} ${
                featuredVehicleIds.has(vehicle.id) ? styles.selected : ""
              }`}
              onClick={() => handleFeaturedVehicleChange(vehicle.id)}
            >
              {vehicle.marca} {vehicle.modelo}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSaveChanges}
        className="btn btn-principal"
        disabled={loading}
      >
        {loading ? "Guardando..." : "Guardar Cambios"}
      </button>
    </div>
  );
};
