import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./VehicleDetailPage.module.css";

// --- 1. INTERFAZ COMPLETA Y CORRECTA ---
interface VehicleDetail {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  imagenes?: { url: string }[];
  categoria?: string;
  traccion?: string;
  numero_pasajeros?: number;
  potencia_hp?: number;
  torque_nm?: number;
  aceleracion_0_100?: number;
  velocidad_maxima?: number;
  autonomia_km?: number;
  capacidad_bateria_kwh?: number;
  tiempo_carga_dc?: number;
  tiempo_carga_ac?: number;
  largo_mm?: number;
  ancho_mm?: number;
  alto_mm?: number;
  distancia_ejes_mm?: number;
  peso_kg?: number;
  capacidad_maletero_l?: number;
  colores_disponibles?: string[];
  seguridad?: string[];
  interior?: string[];
  exterior?: string[];
  tecnologia?: string[];
}

// --- 2. COMPONENTES HELPER CON TIPOS DEFINIDOS ---
const SpecItem: React.FC<{
  label: string;
  value?: string | number;
  unit?: string;
}> = ({ label, value, unit = "" }) =>
  value ? (
    <li>
      <strong>{label}:</strong>{" "}
      <span>
        {value} {unit}
      </span>
    </li>
  ) : null;

const FeatureList: React.FC<{ title: string; features?: string[] }> = ({
  title,
  features,
}) =>
  features && features.length > 0 ? (
    <div className={styles.featureSection}>
      <h4>{title}</h4>
      <ul>
        {features.map((feature: string, index: number) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
    </div>
  ) : null;

export const VehicleDetailPage = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  // --- 3. ESTADOS CON TIPOS DEFINIDOS Y SIN CÓDIGO ANTIGUO ---
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [activeTab, setActiveTab] = useState("rendimiento");
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
      toast.success("¡Gracias! Un asesor te contactará pronto.");
      setLead({ nombre: "", email: "", telefono: "" });
    } catch (error) {
      toast.error("No se pudo enviar tu solicitud. Intenta más tarde.");
    }
  };

  if (!vehicle) return <p>Cargando detalles del vehículo...</p>;

  return (
    <div className={styles.detailContainer}>
      {/* --- HERO SECTION --- */}
      <div className={styles.hero}>
        <div className={styles.heroImage}>
          <img
            src={
              vehicle.imagenes?.[0]
                ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
                : "/placeholder.png"
            }
            alt={`${vehicle.marca} ${vehicle.modelo}`}
          />
        </div>
        <div className={styles.heroInfo}>
          <h1>
            {vehicle.marca} {vehicle.modelo}
          </h1>
          <p className={styles.price}>
            {new Intl.NumberFormat("es-CR", {
              style: "currency",
              currency: "CRC",
            }).format(vehicle.precio_venta)}
          </p>
          <div className={styles.keySpecs}>
            <div>
              <span>{vehicle.autonomia_km} km</span>
              <p>Autonomía</p>
            </div>
            <div>
              <span>{vehicle.aceleracion_0_100} s</span>
              <p>0-100 km/h</p>
            </div>
            <div>
              <span>{vehicle.potencia_hp} HP</span>
              <p>Potencia</p>
            </div>
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

      {/* --- TABS DE ESPECIFICACIONES --- */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab("rendimiento")}
          className={activeTab === "rendimiento" ? styles.active : ""}
        >
          Rendimiento
        </button>
        <button
          onClick={() => setActiveTab("dimensiones")}
          className={activeTab === "dimensiones" ? styles.active : ""}
        >
          Dimensiones
        </button>
        <button
          onClick={() => setActiveTab("equipamiento")}
          className={activeTab === "equipamiento" ? styles.active : ""}
        >
          Equipamiento
        </button>
      </div>

      {/* --- 4. CONTENIDO DE TABS COMPLETO Y CORRECTO --- */}
      <div className={styles.tabContent}>
        {activeTab === "rendimiento" && (
          <ul>
            <SpecItem label="Potencia" value={vehicle.potencia_hp} unit="HP" />
            <SpecItem label="Torque" value={vehicle.torque_nm} unit="Nm" />
            <SpecItem
              label="Aceleración (0-100 km/h)"
              value={vehicle.aceleracion_0_100}
              unit="s"
            />
            <SpecItem
              label="Velocidad Máxima"
              value={vehicle.velocidad_maxima}
              unit="km/h"
            />
            <SpecItem label="Tracción" value={vehicle.traccion} />
            <SpecItem
              label="Autonomía"
              value={vehicle.autonomia_km}
              unit="km"
            />
            <SpecItem
              label="Capacidad de Batería"
              value={vehicle.capacidad_bateria_kwh}
              unit="kWh"
            />
            <SpecItem
              label="Carga Lenta (AC)"
              value={vehicle.tiempo_carga_ac}
              unit="horas"
            />
            <SpecItem
              label="Carga Rápida (DC)"
              value={vehicle.tiempo_carga_dc}
              unit="minutos"
            />
          </ul>
        )}
        {activeTab === "dimensiones" && (
          <ul>
            <SpecItem label="Largo" value={vehicle.largo_mm} unit="mm" />
            <SpecItem label="Ancho" value={vehicle.ancho_mm} unit="mm" />
            <SpecItem label="Alto" value={vehicle.alto_mm} unit="mm" />
            <SpecItem
              label="Distancia entre Ejes"
              value={vehicle.distancia_ejes_mm}
              unit="mm"
            />
            <SpecItem label="Peso" value={vehicle.peso_kg} unit="kg" />
            <SpecItem
              label="Capacidad de Maletero"
              value={vehicle.capacidad_maletero_l}
              unit="L"
            />
            <SpecItem
              label="Número de Pasajeros"
              value={vehicle.numero_pasajeros}
            />
          </ul>
        )}
        {activeTab === "equipamiento" && (
          <div className={styles.featureGrid}>
            <FeatureList title="Seguridad" features={vehicle.seguridad} />
            <FeatureList title="Interior" features={vehicle.interior} />
            <FeatureList title="Exterior" features={vehicle.exterior} />
            <FeatureList title="Tecnología" features={vehicle.tecnologia} />
          </div>
        )}
      </div>
    </div>
  );
};
