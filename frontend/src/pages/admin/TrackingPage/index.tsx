import React, { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import UpdateLocationModal from "../../../components/UpdateLocationModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Vehicle, TrackingLog } from "../../../interfaces";
import styles from "./TrackingPage.module.css"; // <--- Importamos los nuevos estilos

// Definimos el tipo para Bodega aquí también
interface Bodega {
  id: number;
  nombre: string;
}

const TrackingPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]); // <--- Nuevo estado para las bodegas
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchBodegas(); // <--- Llamamos a la nueva función para cargar bodegas
  }, []);

  const fetchVehicles = async () => {
    const response = await apiClient.get<Vehicle[]>("/vehicles");
    setVehicles(response.data);
  };

  // --- Nueva función para obtener las bodegas de la API ---
  const fetchBodegas = async () => {
    try {
      const response = await apiClient.get<Bodega[]>("/bodegas");
      setBodegas(response.data);
    } catch (error) {
      console.error("Error al cargar las bodegas:", error);
    }
  };
  // ---

  const handleOpenModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleUpdateLocation = async (destination: string) => {
    if (!selectedVehicle) return;

    try {
      await apiClient.post("/tracking", {
        vehicleId: selectedVehicle.id,
        destination,
      });

      const logResponse = await apiClient.get<TrackingLog>(
        `/tracking/vehicle/${selectedVehicle.id}/latest-log`
      );
      generatePDF(logResponse.data);

      fetchVehicles();
      handleCloseModal();
    } catch (error) {
      console.error("Error al actualizar la ubicación:", error);
    }
  };

  const generatePDF = (logData: TrackingLog) => {
    const doc = new jsPDF();
    const { vehicle, origin, destination, departureTime, departureUser } =
      logData;

    doc.text("Hoja de Registro de Movimiento de Vehículo", 14, 20);

    // 2. Llama a autoTable como una función, pasándole 'doc'
    autoTable(doc, {
      startY: 30,
      head: [["Campo", "Valor"]],
      body: [
        ["Vehículo", `${vehicle.marca} ${vehicle.modelo}`],
        ["Color", vehicle.color],
        ["Año", vehicle.year],
        ["VIN", vehicle.vin],
        ["Origen", origin],
        ["Destino", destination],
        ["Fecha de Salida", new Date(departureTime).toLocaleString()],
        ["Encargado de Salida", departureUser.email],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY || 80;

    doc.text("_________________________", 20, finalY + 20);
    doc.text("Firma Encargado de Salida", 20, finalY + 25);

    doc.text("_________________________", 120, finalY + 20);
    doc.text("Firma Encargado de Entrada", 120, finalY + 25);

    doc.save(`registro-movimiento-${vehicle.vin}.pdf`);
  };
  return (
    // Aplicamos el estilo al contenedor principal
    <div className={styles.trackingContainer}>
      <h1>Rastreo de Vehículos</h1>
      {/* Aplicamos los estilos a la tabla */}
      <table className={styles.trackingTable}>
        <thead>
          <tr>
            <th>Marca</th>
            <th>Modelo</th>
            <th>VIN</th>
            <th>Ubicación Actual</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle: Vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.marca}</td>
              <td>{vehicle.modelo}</td>
              <td>{vehicle.vin}</td>
              <td>{vehicle.currentLocation}</td>
              <td>
                <button
                  className={styles.actionButton}
                  onClick={() => handleOpenModal(vehicle)}
                >
                  Mover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isModalOpen && (
        <UpdateLocationModal
          vehicle={selectedVehicle}
          bodegas={bodegas} // <--- Pasamos la lista de bodegas al modal
          onClose={handleCloseModal}
          onUpdate={handleUpdateLocation}
        />
      )}
    </div>
  );
};

export default TrackingPage;
