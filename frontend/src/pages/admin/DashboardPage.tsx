import { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import { VehicleForm } from "../../components/VechicleForm/VehicleForm"; // Ruta actualizada
import styles from "./DashboardPage.module.css";

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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    window.location.reload();
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
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h1>Dashboard de Administración</h1>
        <button onClick={handleLogout}>Cerrar Sesión</button>
      </div>
      <hr />

      <div>
        <h3>Añadir Nuevo Vehículo</h3>
        {/* Ahora solo le pasamos la función que debe ejecutar cuando todo sale bien */}
        <VehicleForm onSuccess={fetchVehicles} />
      </div>
      <hr />

      <div>
        <h2>Inventario de Vehículos</h2>
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
                  <button onClick={() => handleDelete(vehicle.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
