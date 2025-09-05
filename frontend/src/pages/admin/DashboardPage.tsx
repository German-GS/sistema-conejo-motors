import { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import { VehicleForm } from "../../components/VechicleForm/VehicleForm"; // Corregida la ruta si es necesario
import { Card } from "../../components/Card";
import styles from "./DashboardPage.module.css";

// Interfaz para el tipo de dato Vehicle
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  vin: string;
  estado: string;
}

export const DashboardPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");

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
      <Card title="Añadir Nuevo Vehículo">
        <VehicleForm onSuccess={fetchVehicles} />
      </Card>

      <Card title="Inventario de Vehículos">
        {error && <p style={{ color: "red" }}>{error}</p>}
        <table className={styles.inventoryTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Año</th>
              <th>VIN</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td>{vehicle.id}</td>
                <td>{vehicle.marca}</td>
                <td>{vehicle.modelo}</td>
                <td>{vehicle.año}</td>
                <td>{vehicle.vin}</td>
                <td>{vehicle.estado}</td>
                <td>
                  <button>Editar</button>
                  <button onClick={() => handleDelete(vehicle.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
};
