import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import { Modal } from "@/components/Modal";
import styles from "./ComparePage.module.css";
import stylesLayout from "@/components/PublicLayout/PublicLayout.module.css";

// Interfaces
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  imagenes?: { url: string }[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(
    value
  );

// Componente para una columna de selección de vehículo
const VehicleSelector = ({
  vehicle,
  onSelectClick,
}: {
  vehicle: Vehicle | null;
  onSelectClick: () => void;
}) => (
  <div className={styles.selectorCard}>
    {vehicle ? (
      <>
        <img
          src={
            vehicle.imagenes?.[0]
              ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
              : "/placeholder.png"
          }
          alt={`${vehicle.marca} ${vehicle.modelo}`}
        />
        <h3>
          {vehicle.marca} {vehicle.modelo}
        </h3>
        <p>{formatCurrency(vehicle.precio_venta)}</p>
        <button className="btn btn-secondary" onClick={onSelectClick}>
          Cambiar
        </button>
      </>
    ) : (
      <div className={styles.emptySelector}>
        <button className="btn btn-principal" onClick={onSelectClick}>
          Seleccionar Auto
        </button>
      </div>
    )}
  </div>
);

export const ComparePage = () => {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<(Vehicle | null)[]>([
    null,
    null,
    null,
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get("/vehicles/sales/catalog")
      .then((res) => setAllVehicles(res.data));
  }, []);

  const handleSelectClick = (index: number) => {
    setActiveSlot(index);
    setIsModalOpen(true);
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    if (activeSlot !== null) {
      const newSelection = [...selectedVehicles];
      newSelection[activeSlot] = vehicle;
      setSelectedVehicles(newSelection);
    }
    setIsModalOpen(false);
    setActiveSlot(null);
  };

  const characteristics = [
    { key: "precio_venta", label: "Precio Base" },
    { key: "autonomia_km", label: "Autonomía (km)" },
    { key: "potencia_hp", label: "Potencia (HP)" },
    { key: "capacidad_bateria_kwh", label: "Batería (kWh)" },
    { key: "año", label: "Año del Modelo" },
  ];

  // --- FUNCIÓN HELPER PARA RENDERIZAR CELDAS ---
  const renderCellContent = (
    vehicle: Vehicle | null,
    characteristicKey: string
  ) => {
    if (!vehicle) return "-";

    const value = vehicle[characteristicKey as keyof Vehicle];

    if (characteristicKey === "precio_venta") {
      return formatCurrency(value as number);
    }

    // Aseguramos que el valor sea un string o un número antes de devolverlo
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }

    return "-";
  };

  return (
    // Aplicamos el contenedor general a toda la página
    <div className={stylesLayout.pageContainer}>
      <div className={styles.compareContainer}>
        <h1>Compara Nuestros Vehículos</h1>
        <p>Selecciona hasta 3 modelos para ver sus diferencias lado a lado.</p>

        <div className={styles.selectorsGrid}>
          {selectedVehicles.map((vehicle, index) => (
            <VehicleSelector
              key={index}
              vehicle={vehicle}
              onSelectClick={() => handleSelectClick(index)}
            />
          ))}
        </div>

        {selectedVehicles.some((v) => v) && (
          <div className={styles.tableContainer}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th>Característica</th>
                  {selectedVehicles.map((v, i) => (
                    <th key={i}>{v ? `${v.marca} ${v.modelo}` : "Modelo"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characteristics.map((char) => (
                  <tr key={char.key}>
                    <td>{char.label}</td>
                    {selectedVehicles.map((v, i) => (
                      <td key={i}>{renderCellContent(v, char.key)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Selecciona un Vehículo"
        >
          <div className={styles.modalVehicleList}>
            {allVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className={styles.modalVehicleItem}
                onClick={() => handleVehicleSelect(vehicle)}
              >
                <img
                  src={
                    vehicle.imagenes?.[0]
                      ? `${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`
                      : "/placeholder.png"
                  }
                  alt={vehicle.modelo}
                />
                <div>
                  <h4>
                    {vehicle.marca} {vehicle.modelo}
                  </h4>
                  <p>{formatCurrency(vehicle.precio_venta)}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
};
