import React, { useState } from "react";
import apiClient from "../../api/apiClient";
import styles from "./VehicleForm.module.css";

// 1. La interfaz de props estaba mal definida. Ahora es correcta.
interface VehicleFormProps {
  onSuccess: () => void;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    marca: "",
    modelo: "",
    año: "",
    vin: "",
    color: "",
    precio_costo: "",
    precio_venta: "",
    autonomia_km: "",
    potencia_hp: "",
    capacidad_bateria_kwh: "",
  });

  // 2. Faltaban estos dos 'useState' para el archivo y el error.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  // 3. Faltaba la función para manejar el cambio de archivo.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Paso 1: Crear el vehículo con los datos de texto
      const vehicleResponse = await apiClient.post("/vehicles", formData);
      const newVehicleId = vehicleResponse.data.id;

      alert("Vehículo creado con éxito. Subiendo imagen...");

      // Paso 2: Si hay un archivo, subirlo
      if (selectedFile) {
        const imageFormData = new FormData();
        imageFormData.append("file", selectedFile);

        await apiClient.post(
          `/vehicles/${newVehicleId}/upload`,
          imageFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        alert("Imagen subida con éxito.");
      }

      onSuccess(); // Llama a la función onSuccess (refrescar la lista)
    } catch (err) {
      setError("Ocurrió un error. Revisa la consola.");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Todos los inputs que ya tenías están bien */}
      <input
        name="marca"
        value={formData.marca}
        onChange={handleChange}
        placeholder="Marca"
        required
      />
      <input
        name="modelo"
        value={formData.modelo}
        onChange={handleChange}
        placeholder="Modelo"
        required
      />
      <input
        name="año"
        type="number"
        value={formData.año}
        onChange={handleChange}
        placeholder="Año"
        required
      />
      <input
        name="vin"
        value={formData.vin}
        onChange={handleChange}
        placeholder="VIN"
        required
      />
      <input
        name="color"
        value={formData.color}
        onChange={handleChange}
        placeholder="Color"
      />
      <input
        name="precio_costo"
        type="number"
        value={formData.precio_costo}
        onChange={handleChange}
        placeholder="Precio de Costo"
        required
      />
      <input
        name="precio_venta"
        type="number"
        value={formData.precio_venta}
        onChange={handleChange}
        placeholder="Precio de Venta"
        required
      />
      <input
        name="autonomia_km"
        type="number"
        value={formData.autonomia_km}
        onChange={handleChange}
        placeholder="Autonomía (km)"
      />
      <input
        name="potencia_hp"
        type="number"
        value={formData.potencia_hp}
        onChange={handleChange}
        placeholder="Potencia (HP)"
      />
      <input
        name="capacidad_bateria_kwh"
        type="number"
        value={formData.capacidad_bateria_kwh}
        onChange={handleChange}
        placeholder="Batería (kWh)"
      />

      <div>
        <label>Imagen del Vehículo:</label>
        <input type="file" onChange={handleFileChange} />
      </div>

      <button type="submit">Añadir Vehículo</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
};
