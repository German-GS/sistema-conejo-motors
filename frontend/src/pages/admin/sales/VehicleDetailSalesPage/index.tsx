import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import apiClient from "@/api/apiClient";
import { getImageUrl } from "@/utils/imageUrl";
import toast from "react-hot-toast";
import styles from "./VehicleDetailSalesPage.module.css";

interface VehicleDetail {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color?: string;
  precio_venta: number;
  precio_venta_usd?: number;
  imagenes?: { id: number; url: string }[];
  bodega?: { nombre: string };
  potencia_hp?: number;
  torque_nm?: number;
  aceleracion_0_100?: number;
  velocidad_maxima?: number;
  autonomia_km?: number;
  capacidad_bateria_kwh?: number;
  numero_pasajeros?: number;
  largo_mm?: number;
  ancho_mm?: number;
  alto_mm?: number;
  peso_kg?: number;
  capacidad_maletero_l?: number;
  seguridad?: string[];
  interior?: string[];
  exterior?: string[];
  tecnologia?: string[];
  traccion?: string;
  categoria?: string;
}

const Spec = ({ icon, label, value, unit }: { icon: string; label: string; value?: number | string | null; unit?: string }) =>
  value ? (
    <div className={styles.specItem}>
      <span className={styles.specIcon}>{icon}</span>
      <div>
        <p className={styles.specValue}>{value} {unit}</p>
        <p className={styles.specLabel}>{label}</p>
      </div>
    </div>
  ) : null;

const FeatureGroup = ({ title, items }: { title: string; items?: string[] }) =>
  items && items.length > 0 ? (
    <div className={styles.featureGroup}>
      <h4>{title}</h4>
      <ul>{items.map((item, i) => <li key={i}>✓ {item}</li>)}</ul>
    </div>
  ) : null;

const formatCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(v);

export const VehicleDetailSalesPage = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith("/admin") ? "/admin/sales" : "/sales";

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<"rendimiento" | "dimensiones" | "equipamiento">("rendimiento");

  useEffect(() => {
    if (!vehicleId) return;
    apiClient.get(`/vehicles/${vehicleId}`)
      .then(res => setVehicle(res.data))
      .catch(() => toast.error("No se pudo cargar el vehículo."));
  }, [vehicleId]);

  if (!vehicle) return <p style={{ padding: "2rem" }}>Cargando...</p>;

  
  const images = vehicle.imagenes ?? [];

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Volver al catálogo</button>
        <button
          className={styles.cotizarBtn}
          onClick={() => navigate(`${basePath}/catalog/${vehicle.id}/quote`)}
        >
          💼 Cotizar este vehículo
        </button>
      </div>

      {/* HERO */}
      <div className={styles.hero}>
        {/* Galería */}
        <div className={styles.gallery}>
          <div className={styles.mainImgWrapper}>
            <img
              className={styles.mainImg}
              src={images[activeImg] ? getImageUrl(images[activeImg].url) : "/placeholder.png"}
              alt={`${vehicle.marca} ${vehicle.modelo}`}
            />
          </div>
          {images.length > 1 && (
            <div className={styles.thumbnails}>
              {images.map((img, i) => (
                <img
                  key={img.id ?? i}
                  src={getImageUrl(img.url)}
                  alt={`Vista ${i + 1}`}
                  className={i === activeImg ? styles.thumbActive : styles.thumb}
                  onClick={() => setActiveImg(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info principal */}
        <div className={styles.info}>
          <div className={styles.badges}>
            {vehicle.categoria && <span className={styles.badge}>{vehicle.categoria}</span>}
            {vehicle.traccion && <span className={styles.badge}>{vehicle.traccion}</span>}
          </div>
          <h1>{vehicle.marca} {vehicle.modelo}</h1>
          <p className={styles.year}>{vehicle.año} {vehicle.color && `· ${vehicle.color}`}</p>
          <p className={styles.price}>
            {formatCRC(vehicle.precio_venta)}
            {vehicle.precio_venta_usd && (
              <span style={{ fontSize: "0.75em", color: "#64748b", marginLeft: "0.6rem", fontWeight: 400 }}>
                / ${Number(vehicle.precio_venta_usd).toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
              </span>
            )}
          </p>
          {vehicle.bodega && <p className={styles.location}>📍 {vehicle.bodega.nombre}</p>}

          {/* Specs clave */}
          <div className={styles.keySpecs}>
            <Spec icon="⚡" label="Potencia"  value={vehicle.potencia_hp}           unit="HP" />
            <Spec icon="🔋" label="Batería"   value={vehicle.capacidad_bateria_kwh}  unit="kWh" />
            <Spec icon="🛣️" label="Autonomía" value={vehicle.autonomia_km}           unit="km" />
            <Spec icon="🏎️" label="0-100 km/h" value={vehicle.aceleracion_0_100}     unit="s" />
          </div>

          <button
            className={styles.cotizarBtnLarge}
            onClick={() => navigate(`${basePath}/catalog/${vehicle.id}/quote`)}
          >
            💼 Cotizar este vehículo
          </button>
        </div>
      </div>

      {/* TABS DE SPECS */}
      <div className={styles.tabs}>
        {(["rendimiento", "dimensiones", "equipamiento"] as const).map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === "rendimiento" && (
          <div className={styles.specsGrid}>
            <Spec icon="⚡" label="Potencia"          value={vehicle.potencia_hp}           unit="HP" />
            <Spec icon="🔩" label="Torque"            value={vehicle.torque_nm}             unit="Nm" />
            <Spec icon="🏎️" label="0-100 km/h"       value={vehicle.aceleracion_0_100}     unit="s" />
            <Spec icon="🚀" label="Vel. Máxima"       value={vehicle.velocidad_maxima}      unit="km/h" />
            <Spec icon="🛣️" label="Autonomía"         value={vehicle.autonomia_km}          unit="km" />
            <Spec icon="🔋" label="Batería"           value={vehicle.capacidad_bateria_kwh} unit="kWh" />
            <Spec icon="👥" label="Pasajeros"         value={vehicle.numero_pasajeros} />
            <Spec icon="🔄" label="Tracción"          value={vehicle.traccion} />
          </div>
        )}
        {activeTab === "dimensiones" && (
          <div className={styles.specsGrid}>
            <Spec icon="↔️" label="Largo"             value={vehicle.largo_mm}             unit="mm" />
            <Spec icon="↕️" label="Ancho"             value={vehicle.ancho_mm}             unit="mm" />
            <Spec icon="⬆️" label="Alto"              value={vehicle.alto_mm}              unit="mm" />
            <Spec icon="⚖️" label="Peso"              value={vehicle.peso_kg}              unit="kg" />
            <Spec icon="🧳" label="Maletero"          value={vehicle.capacidad_maletero_l} unit="L" />
          </div>
        )}
        {activeTab === "equipamiento" && (
          <div className={styles.featureGrid}>
            <FeatureGroup title="🛡️ Seguridad"   items={vehicle.seguridad} />
            <FeatureGroup title="🪑 Interior"    items={vehicle.interior} />
            <FeatureGroup title="🚗 Exterior"    items={vehicle.exterior} />
            <FeatureGroup title="📱 Tecnología"  items={vehicle.tecnologia} />
          </div>
        )}
        {activeTab !== "equipamiento" && (
          !vehicle.potencia_hp && !vehicle.autonomia_km && !vehicle.largo_mm ? (
            <p className={styles.noData}>No hay especificaciones registradas para este vehículo. Puedes agregarlas editando el perfil del modelo.</p>
          ) : null
        )}
      </div>

    </div>
  );
};
