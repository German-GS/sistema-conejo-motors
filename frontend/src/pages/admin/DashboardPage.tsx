import { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import { VehicleForm } from "../../components/VechicleForm/VehicleForm";
import { Card } from "../../components/Card";
import styles from "./DashboardPage.module.css";
import { Modal } from "../../components/Modal";

// Interfaz para el tipo de dato Vehicle
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  vin: string;
  color: string;
  precio_costo: number;
  precio_venta: number;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  estado: string;
  imagenes?: { id: number; url: string }[];
  bodega?: { id: number; nombre: string };
}

export const DashboardPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    try {
      const response = await apiClient.get("/vehicles");
      setVehicles(response.data);
    } catch (err) {
      setError("No se pudo cargar el inventario.");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingVehicle(null); // Nos aseguramos de que no hay datos de edición
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle); // Pasamos los datos del vehículo a editar
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSuccess = () => {
    fetchVehicles(); // Refresca la lista
    handleCloseModal(); // Cierra el modal
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este vehículo?")) {
      try {
        await apiClient.delete(`/vehicles/${id}`);
        alert("Vehículo eliminado con éxito.");
        fetchVehicles();
      } catch (err) {
        setError("Error al eliminar el vehículo.");
        console.error(err);
      }
    }
  };

  return (
    <>
      <div className={styles.header}>
        <h1>Inventario de Vehículos</h1>
        <button className="btn btn-principal" onClick={handleOpenCreateModal}>
          Añadir Vehículo
        </button>
      </div>

      <Card title="Inventario de Vehículos">
        {error && <p style={{ color: "red" }}>{error}</p>}

        <table className={styles.inventoryTable}>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>ID</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Año</th>
              <th>VIN</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td>
                  {vehicle.imagenes && vehicle.imagenes.length > 0 ? (
                    <img
                      src={`${apiClient.defaults.baseURL}/${vehicle.imagenes[0].url}`}
                      alt={`${vehicle.marca} ${vehicle.modelo}`}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <div className={styles.noImage}>Sin foto</div>
                  )}
                </td>
                <td>{vehicle.id}</td>
                <td>{vehicle.marca}</td>
                <td>{vehicle.modelo}</td>
                <td>{vehicle.año}</td>
                <td>{vehicle.vin}</td>
                <td>{vehicle.bodega?.nombre || "N/A"}</td>
                <td>{vehicle.estado}</td>
                <td>
                  <button onClick={() => handleOpenEditModal(vehicle)}>
                    Editar
                  </button>
                  <button onClick={() => handleDelete(vehicle.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Este es el modal que se mostrará al hacer clic */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingVehicle ? "Editar Vehículo" : "Añadir Nuevo Vehículo"}
      >
        <VehicleForm onSuccess={handleSuccess} initialData={editingVehicle} />
      </Modal>
    </>
  );
};
