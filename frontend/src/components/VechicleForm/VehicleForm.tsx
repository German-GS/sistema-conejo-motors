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

// --- INTERFACES ---
interface Bodega {
  id: number;
  nombre: string;
}

interface VehicleProfile {
  id: number;
  marca: string;
  modelo: string;
  potencia_hp: number;
  autonomia_km: number;
  capacidad_bateria_kwh: number;
}

// 👇 CORRECCIÓN 1: Actualizamos la interfaz del Vehículo 👇
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
  imagenes?: { id: number; url: string; order: number }[];
  categoria?: string;
  traccion?: string;
  numero_pasajeros?: number;
  equipamiento_destacado?: string;
  material_interior?: string;
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
    profileId: "",
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
    categoria: "",
    traccion: "",
    numero_pasajeros: "5",
    equipamiento_destacado: "",
    material_interior: "",
  });

  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [error, setError] = useState("");
  const isEditing = !!initialData;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: number; url: string; order: number }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bodegasRes, profilesRes] = await Promise.all([
          apiClient.get("/bodegas"),
          apiClient.get("/vehicle-profiles"),
        ]);
        setBodegas(bodegasRes.data);
        setProfiles(profilesRes.data);
      } catch (err) {
        console.error("Error al cargar datos iniciales", err);
        toast.error("No se pudieron cargar los perfiles y bodegas.");
      }
    };
    fetchData();
  }, []);

  // 👇 CORRECCIÓN 2: Actualizamos la función resetForm 👇
  const resetForm = () => {
    setFormData({
      profileId: "",
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
      categoria: "",
      traccion: "",
      numero_pasajeros: "5",
      equipamiento_destacado: "",
      material_interior: "",
    });
    setExistingImages([]);
    setSelectedFiles([]);
  };

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        profileId: "",
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
        categoria: initialData.categoria || "",
        traccion: initialData.traccion || "",
        numero_pasajeros: initialData.numero_pasajeros?.toString() || "5",
        equipamiento_destacado: initialData.equipamiento_destacado || "",
        material_interior: initialData.material_interior || "",
      });
      setExistingImages(
        initialData.imagenes?.map((img, index) => ({ ...img, order: index })) ||
          []
      );
      setSelectedFiles([]);
    } else {
      resetForm();
    }
  }, [initialData, isEditing]);

  // --- MANEJADORES DE EVENTOS ---

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    const selectedProfile = profiles.find((p) => p.id === Number(profileId));

    if (selectedProfile) {
      setFormData((prev) => ({
        ...prev,
        profileId,
        marca: selectedProfile.marca,
        modelo: selectedProfile.modelo,
        potencia_hp: selectedProfile.potencia_hp.toString(),
        autonomia_km: selectedProfile.autonomia_km.toString(),
        capacidad_bateria_kwh: selectedProfile.capacidad_bateria_kwh.toString(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        profileId: "",
        marca: "",
        modelo: "",
        potencia_hp: "",
        autonomia_km: "",
        capacidad_bateria_kwh: "",
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) {
      return;
    }
    const items = Array.from(existingImages);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);
    setExistingImages(items);
  };

  const handleRemoveExistingImage = (imageId: number) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
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
      numero_pasajeros: Number(formData.numero_pasajeros), // Corregido
      bodegaId: formData.bodegaId ? Number(formData.bodegaId) : null,
    };

    try {
      const vehicleResponse = isEditing
        ? await apiClient.patch(`/vehicles/${initialData?.id}`, vehicleData)
        : await apiClient.post("/vehicles", vehicleData);

      const vehicleId = vehicleResponse.data.id;

      if (selectedFiles.length > 0) {
        const uploadFormData = new FormData();
        selectedFiles.forEach((file) => {
          uploadFormData.append("files", file);
        });
        await apiClient.post(`/vehicles/${vehicleId}/upload`, uploadFormData);
      }

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
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Selector de Perfil (solo en modo creación) */}
      {!isEditing && (
        <div className={styles.profileSelectorWrapper}>
          <select
            name="profileId"
            value={formData.profileId}
            onChange={handleProfileChange}
            className={styles.profileSelector}
          >
            <option value="">
              -- Seleccionar un Perfil para Autocompletar --
            </option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.marca} - {profile.modelo}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Inputs de Datos */}
      <input
        name="marca"
        value={formData.marca}
        onChange={handleChange}
        placeholder="Marca"
        required
        disabled={!!formData.profileId}
        className={styles.formInput}
      />
      <input
        name="modelo"
        value={formData.modelo}
        onChange={handleChange}
        placeholder="Modelo"
        required
        disabled={!!formData.profileId}
        className={styles.formInput}
      />
      <input
        name="año"
        type="number"
        value={formData.año}
        onChange={handleChange}
        placeholder="Año"
        required
        className={styles.formInput}
      />
      <input
        name="vin"
        value={formData.vin}
        onChange={handleChange}
        placeholder="VIN"
        required
        disabled={isEditing}
        className={styles.formInput}
      />
      <input
        name="color"
        value={formData.color}
        onChange={handleChange}
        placeholder="Color"
        required
        className={styles.formInput}
      />
      <input
        name="precio_costo"
        type="number"
        value={formData.precio_costo}
        onChange={handleChange}
        placeholder="Precio de Costo"
        required
        className={styles.formInput}
      />
      <input
        name="precio_venta"
        type="number"
        value={formData.precio_venta}
        onChange={handleChange}
        placeholder="Precio de Venta"
        required
        className={styles.formInput}
      />
      <input
        name="autonomia_km"
        type="number"
        value={formData.autonomia_km}
        onChange={handleChange}
        placeholder="Autonomía (km)"
        required
        disabled={!!formData.profileId}
        className={styles.formInput}
      />
      <input
        name="potencia_hp"
        type="number"
        value={formData.potencia_hp}
        onChange={handleChange}
        placeholder="Potencia (HP)"
        required
        disabled={!!formData.profileId}
        className={styles.formInput}
      />
      <input
        name="capacidad_bateria_kwh"
        type="number"
        value={formData.capacidad_bateria_kwh}
        onChange={handleChange}
        placeholder="Batería (kWh)"
        required
        disabled={!!formData.profileId}
        className={styles.formInput}
      />

      <select
        name="categoria"
        value={formData.categoria}
        onChange={handleChange}
        className={styles.formSelect}
      >
        <option value="">-- Selecciona Categoría --</option>
        <option value="Sedan">Sedan</option>
        <option value="SUV">SUV</option>
        <option value="Pickup">Pickup</option>
        <option value="Hatchback">Hatchback</option>
        <option value="Comercial">Comercial</option>
        <option value="Urbano">Urbano</option>
      </select>

      <select
        name="traccion"
        value={formData.traccion}
        onChange={handleChange}
        className={styles.formSelect}
      >
        <option value="">-- Selecciona Tracción --</option>
        <option value="4x2">4x2</option>
        <option value="4x4">4x4</option>
        <option value="AWD">AWD (Tracción Total)</option>
      </select>

      <select
        name="numero_pasajeros"
        value={formData.numero_pasajeros}
        onChange={handleChange}
        className={styles.formSelect}
      >
        <option value="">-- N° de Pasajeros --</option>
        <option value="2">2 Pasajeros</option>
        <option value="5">5 Pasajeros</option>
        <option value="7">7 Pasajeros</option>
      </select>

      <input
        name="material_interior"
        type="text"
        value={formData.material_interior}
        onChange={handleChange}
        placeholder="Material Interior (Ej: Cuero)"
        className={styles.formInput}
      />

      <input
        name="equipamiento_destacado"
        type="text"
        value={formData.equipamiento_destacado}
        onChange={handleChange}
        placeholder="Equipamiento (Ej: Techo panorámico, A/C)"
        className={`${styles.formInput} ${styles.fullWidth}`}
      />

      {!isEditing && (
        <select
          name="bodegaId"
          value={formData.bodegaId}
          onChange={handleChange}
          className={styles.formSelect}
        >
          <option value="">-- Asignar Ubicación Inicial (Opcional) --</option>
          {bodegas.map((bodega) => (
            <option key={bodega.id} value={bodega.id}>
              {bodega.nombre}
            </option>
          ))}
        </select>
      )}

      {/* Sección de Imágenes Existentes (solo en modo edición) */}
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
                      key={image.id.toString()}
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

      {/* Input para Subir Nuevas Imágenes */}
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

      {/* Botón de Envío y Mensaje de Error */}
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
