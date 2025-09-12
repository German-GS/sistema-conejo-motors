// src/pages/public/VehicleDetailPage.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./VehicleDetailPage.module.css";

// Reutilizamos la interfaz del catálogo
interface CatalogVehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  imagenes?: { url: string }[];
  categoria: string;
  traccion: string;
  numero_pasajeros: number;
  material_interior: string;
  equipamiento_destacado: string;
}

export const VehicleDetailPage = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [vehicle, setVehicle] = useState<CatalogVehicle | null>(null);
  const [lead, setLead] = useState({ nombre: "", email: "", telefono: "" });

  useEffect(() => {
    apiClient
      .get(`/vehicles/${vehicleId}`)
      .then((res) => setVehicle(res.data))
      .catch(() => toast.error("Vehículo no encontrado."));
  }, [vehicleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLead({ ...lead, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/leads", { ...lead, vehiculoId: vehicle?.id });
      toast.success("¡Gracias por tu interés! Un asesor te contactará pronto.");
      setLead({ nombre: "", email: "", telefono: "" });
    } catch (error) {
      toast.error("No se pudo enviar tu solicitud. Intenta más tarde.");
    }
  };

  if (!vehicle) return <p>Cargando...</p>;

  return (
    <div className={styles.detailLayout}>
      <div className={styles.gallery}>
        <img
          src={
            vehicle.imagenes?.[0]
              ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
              : "/placeholder.png"
          }
          alt={vehicle.modelo}
        />
        {/* Aquí podría ir una galería de imágenes más completa */}
      </div>
      <div className={styles.info}>
        <h1>
          {vehicle.marca} {vehicle.modelo}
        </h1>
        <p className={styles.price}>
          {new Intl.NumberFormat("es-CR", {
            style: "currency",
            currency: "CRC",
          }).format(vehicle.precio_venta)}
        </p>
        <div className={styles.specs}>
          <div>
            <span>Autonomía</span>
            <strong>{vehicle.autonomia_km} km</strong>
          </div>
          <div>
            <span>Potencia</span>
            <strong>{vehicle.potencia_hp} HP</strong>
          </div>
          <div>
            <span>Batería</span>
            <strong>{vehicle.capacidad_bateria_kwh} kWh</strong>
          </div>
          <div>
            <span>Pasajeros</span>
            <strong>{vehicle.numero_pasajeros}</strong>
          </div>
          <div>
            <span>Tracción</span>
            <strong>{vehicle.traccion}</strong>
          </div>
        </div>
        <div className={styles.detailsSection}>
          <h3>Características Adicionales</h3>
          <ul>
            {vehicle.categoria && (
              <li>
                <strong>Categoría:</strong> {vehicle.categoria}
              </li>
            )}
            {vehicle.material_interior && (
              <li>
                <strong>Interior:</strong> {vehicle.material_interior}
              </li>
            )}
            {vehicle.equipamiento_destacado && (
              <li>
                <strong>Equipamiento:</strong> {vehicle.equipamiento_destacado}
              </li>
            )}
          </ul>
        </div>

        <div className={styles.contactForm}>
          <h3>¿Interesado? Contáctanos</h3>
          <form onSubmit={handleSubmit}>
            <input
              name="nombre"
              value={lead.nombre}
              onChange={handleChange}
              placeholder="Nombre completo"
              required
            />
            <input
              name="email"
              type="email"
              value={lead.email}
              onChange={handleChange}
              placeholder="Correo electrónico"
              required
            />
            <input
              name="telefono"
              value={lead.telefono}
              onChange={handleChange}
              placeholder="Teléfono (Opcional)"
            />
            <button type="submit" className="btn btn-principal">
              Solicitar Información
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
