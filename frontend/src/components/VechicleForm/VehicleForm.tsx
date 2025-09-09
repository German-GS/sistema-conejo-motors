import React, { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import toast from "react-hot-toast";
import styles from "./VehicleForm.module.css";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
// Interfaces para los tipos de datos
interface Bodega {
  id: number;
  nombre: string;
}

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
  bodega?: Bodega;
  imagenes?: { id: number; url: string }[];
}

interface VehicleFormProps {
  onSuccess: () => void;
  initialData?: Vehicle | null;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  onSuccess,
  initialData,
}) => {
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
    bodegaId: "",
  });
  const wrapperStyles: React.CSSProperties = {
    position: "relative",
    width: "100%",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    backgroundColor: "white",
    backgroundImage:
      "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23555555%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13%205.7L146.2%20202.7%2018.8%2075.1c-6.7-6.7-17.7-6.7-24.4%200-6.7%206.7-6.7%2017.7%200%2024.4l137.9%20137.9c6.7%206.7%2017.7%206.7%2024.4%200l137.9-137.9c6.7-6.7%206.7-17.7%200-24.4-6.8-6.8-17.7-6.8-24.5-.1z%22%2F%3E%3C%2Fsvg%3E')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1rem center",
    backgroundSize: "0.7em",
  };

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

  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [error, setError] = useState("");
  const isEditing = !!initialData;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: number; url: string; order: number }[]
  >([]);

  // Efecto para cargar las bodegas (sin cambios)
  useEffect(() => {
    const fetchBodegas = async () => {
      try {
        const response = await apiClient.get("/bodegas");
        setBodegas(response.data);
      } catch (err) {
        console.error("Error al cargar bodegas", err);
      }
    };
    fetchBodegas();
  }, []);

  // Efecto para rellenar el formulario en modo edición (sin cambios, pero ahora funcionará)
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        marca: initialData.marca || "",
        modelo: initialData.modelo || "",
        año: initialData.año?.toString() || "",
        vin: initialData.vin || "",
        color: initialData.color || "",
        precio_costo: initialData.precio_costo?.toString() || "",
        precio_venta: initialData.precio_venta?.toString() || "",
        autonomia_km: initialData.autonomia_km?.toString() || "",
        potencia_hp: initialData.potencia_hp?.toString() || "",
        capacidad_bateria_kwh:
          initialData.capacidad_bateria_kwh?.toString() || "",
        bodegaId: initialData.bodega?.id?.toString() || "",
      });
      setExistingImages(
        initialData.imagenes?.map((img, index) => ({ ...img, order: index })) ||
          []
      );
    } else {
      // Reinicia estados para un nuevo vehículo
      setFormData({
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
        bodegaId: "",
      });
      setExistingImages([]);
    }
    setSelectedFiles([]);
  }, [initialData, isEditing]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onDragEnd = (result: DropResult) => {
    console.log("--- Drag End ---"); // 1. Confirma que la función se ejecuta

    const { source, destination } = result;

    // Si se suelta fuera de la lista, no hacer nada
    if (!destination) {
      console.log("-> Soltado fuera de la lista. No se hace nada.");
      return;
    }

    // Si se suelta en la misma posición, no hacer nada
    if (destination.index === source.index) {
      console.log("-> Soltado en la misma posición. No se hace nada.");
      return;
    }

    console.log(
      `Moviendo desde el índice ${source.index} al índice ${destination.index}`
    );

    // Creamos una copia del array actual para trabajar con ella
    const items = Array.from(existingImages);
    console.log(
      "Array ANTES del cambio:",
      items.map((img) => img.id)
    );

    // Quitamos el elemento de su lugar original
    const [reorderedItem] = items.splice(source.index, 1);

    // Insertamos el elemento en su nuevo lugar
    items.splice(destination.index, 0, reorderedItem);

    console.log(
      "Array DESPUÉS del cambio:",
      items.map((img) => img.id)
    );

    // Actualizamos el estado con el nuevo array.
    console.log("-> Actualizando el estado de React...");
    setExistingImages(items);
  };

  const handleRemoveExistingImage = (imageId: number) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convertimos el FileList a un Array y lo guardamos
      setSelectedFiles(Array.from(e.target.files));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const vehicleData = {
      ...formData,
      año: Number(formData.año),
      precio_costo: Number(formData.precio_costo),
      precio_venta: Number(formData.precio_venta),
      autonomia_km: Number(formData.autonomia_km),
      potencia_hp: Number(formData.potencia_hp),
      capacidad_bateria_kwh: Number(formData.capacidad_bateria_kwh),
      bodegaId: formData.bodegaId ? Number(formData.bodegaId) : null,
    };

    try {
      // PASO 1: Guardar los datos de texto del vehículo
      const vehicleResponse = isEditing
        ? await apiClient.patch(`/vehicles/${initialData?.id}`, vehicleData)
        : await apiClient.post("/vehicles", vehicleData);

      const vehicleId = vehicleResponse.data.id;

      // PASO 2: Subir las nuevas imágenes (si las hay)
      if (selectedFiles.length > 0) {
        const uploadFormData = new FormData();
        selectedFiles.forEach((file) => {
          uploadFormData.append("files", file);
        });
        await apiClient.post(`/vehicles/${vehicleId}/upload`, uploadFormData);
      }

      // PASO 3: Actualizar el orden y eliminar las imágenes viejas (solo en modo edición)
      if (isEditing) {
        const originalImageIds =
          initialData?.imagenes?.map((img) => img.id) || [];
        const currentImageIds = new Set(existingImages.map((img) => img.id));
        const idsToDelete = originalImageIds.filter(
          (id) => !currentImageIds.has(id)
        );

        const imagesToUpdate = existingImages.map((img, index) => ({
          id: img.id,
          order: index,
        }));

        await apiClient.patch(`/vehicles/${vehicleId}/images`, {
          imagesToUpdate,
          idsToDelete,
        });
      }

      toast.success(
        `Vehículo ${isEditing ? "actualizado" : "creado"} con éxito.`
      );
      onSuccess();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Ocurrió un error al guardar.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* --- Inputs de Texto --- */}
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
        disabled={isEditing}
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

      {/* --- Selector de Bodega --- */}
      {!isEditing && (
        <div style={wrapperStyles}>
          <select
            name="bodegaId"
            value={formData.bodegaId}
            onChange={handleChange}
            style={selectStyles}
          >
            {/* 2. Cambiamos el texto para que sea más claro */}
            <option value="">-- Asignar Ubicación Inicial --</option>
            {bodegas.map((bodega) => (
              <option key={bodega.id} value={bodega.id}>
                {bodega.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- Sección de Arrastrar y Soltar Imágenes --- */}
      {isEditing && existingImages.length > 0 && (
        <div className={styles.existingImagesSection}>
          <h3>Imágenes Actuales (Arrastra para ordenar)</h3>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="image-list" direction="horizontal">
              {(provided) => (
                <div
                  className={styles.existingImagesGrid}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {existingImages.map((image, index) => (
                    <Draggable
                      key={image.id}
                      draggableId={image.id.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          className={styles.existingImageItem}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <img
                            src={`${apiClient.defaults.baseURL}/${image.url}`}
                            alt={`Imagen ${image.id}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(image.id)}
                            className={styles.removeImageButton}
                          >
                            X
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* --- Input para Subir Nuevas Imágenes --- */}
      <div className={styles.fileInputWrapper}>
        <label htmlFor="vehicleImage" className={styles.fileInputLabel}>
          Añadir Nueva(s) Imagen(es)
        </label>
        <span className={styles.fileName}>
          {selectedFiles.length > 0
            ? `${selectedFiles.length} archivo(s) nuevo(s)`
            : "No se han seleccionado nuevos archivos"}
        </span>
        <input
          type="file"
          id="vehicleImage"
          name="files"
          onChange={handleFileChange}
          className={styles.fileInput}
          accept="image/*"
          multiple
        />
      </div>

      {/* --- Botón de Envío y Mensaje de Error --- */}
      <button
        type="submit"
        className="btn btn-principal"
        style={{ gridColumn: "1 / -1" }}
      >
        {isEditing ? "Actualizar Vehículo" : "Añadir Vehículo"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
};
