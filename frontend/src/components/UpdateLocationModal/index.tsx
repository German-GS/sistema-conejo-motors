import React, { useState, useEffect } from "react";
import styles from "./UpdateLocationModal.module.css";
import type { Vehicle } from "../../interfaces";
import toast from "react-hot-toast";

// Definimos un tipo para las bodegas que vamos a recibir
interface Bodega {
  id: number;
  nombre: string;
}

interface UpdateLocationModalProps {
  vehicle: Vehicle | null;
  bodegas: Bodega[]; // Recibimos la lista de bodegas
  onClose: () => void;
  onUpdate: (destination: string) => void;
}

const selectStyles: React.CSSProperties = {
  width: "100%",
  padding: "0.45rem 1rem",
  fontSize: "1rem",
  color: "#333333",
  cursor: "pointer",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
  backgroundColor: "transparent",
  border: "1px solid #cccc",
  borderRadius: "6px",
};

const UpdateLocationModal: React.FC<UpdateLocationModalProps> = ({
  vehicle,
  bodegas,
  onClose,
  onUpdate,
}) => {
  const [destination, setDestination] = useState("");

  // Efecto para limpiar el destino si el vehículo cambia
  useEffect(() => {
    setDestination("");
  }, [vehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) {
      toast.loading("Por favor, selecciona una ubicación de destino.");
      return;
    }
    onUpdate(destination);
  };

  if (!vehicle) {
    return null;
  }

  // --- Filtramos la lista de bodegas aquí ---
  const availableBodegas = bodegas.filter(
    (bodega) => bodega.nombre !== vehicle.currentLocation
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Mover Vehículo</h2>
        <p>
          <strong>Vehículo:</strong> {vehicle.marca} {vehicle.modelo}
        </p>
        <p>
          <strong>Ubicación Actual:</strong> {vehicle.currentLocation}
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="destination">Mover a</label>
            {/* Cambiamos el input por un select */}
            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              style={selectStyles}
            >
              <option value="">Selecciona una bodega...</option>
              {availableBodegas.map((bodega) => (
                <option key={bodega.id} value={bodega.nombre}>
                  {bodega.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.buttons}>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit">Actualizar y Generar Hoja</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateLocationModal;
