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

// --- INTERFACES (Sin cambios) ---
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
  torque_nm: number;
  aceleracion_0_100: number;
  velocidad_maxima: number;
  categoria: string;
  traccion: string;
  largo_mm: number;
  ancho_mm: number;
  alto_mm: number;
  distancia_ejes_mm: number;
  peso_kg: number;
  capacidad_maletero_l: number;
  numero_pasajeros: number;
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
  autonomia_km?: number;
  potencia_hp?: number;
  capacidad_bateria_kwh?: number;
  bodega?: Bodega;
  imagenes?: { id: number; url: string; order: number }[];
  categoria?: string;
  traccion?: string;
  numero_pasajeros?: number;
  torque_nm?: number;
  aceleracion_0_100?: number;
  velocidad_maxima?: number;
  tiempo_carga_dc?: number;
  tiempo_carga_ac?: number;
  largo_mm?: number;
  ancho_mm?: number;
  alto_mm?: number;
  distancia_ejes_mm?: number;
  peso_kg?: number;
  capacidad_maletero_l?: number;
  colores_disponibles?: string[];
  seguridad?: string[];
  interior?: string[];
  exterior?: string[];
  tecnologia?: string[];
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
    torque_nm: "",
    aceleracion_0_100: "",
    velocidad_maxima: "",
    tiempo_carga_dc: "",
    tiempo_carga_ac: "",
    largo_mm: "",
    ancho_mm: "",
    alto_mm: "",
    distancia_ejes_mm: "",
    peso_kg: "",
    capacidad_maletero_l: "",
    colores_disponibles: "",
    seguridad: "",
    interior: "",
    exterior: "",
    tecnologia: "",
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
        toast.error("No se pudieron cargar los perfiles y bodegas.");
      }
    };
    fetchData();
  }, []);

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
      torque_nm: "",
      aceleracion_0_100: "",
      velocidad_maxima: "",
      tiempo_carga_dc: "",
      tiempo_carga_ac: "",
      largo_mm: "",
      ancho_mm: "",
      alto_mm: "",
      distancia_ejes_mm: "",
      peso_kg: "",
      capacidad_maletero_l: "",
      colores_disponibles: "",
      seguridad: "",
      interior: "",
      exterior: "",
      tecnologia: "",
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
        torque_nm: initialData.torque_nm?.toString() || "",
        aceleracion_0_100: initialData.aceleracion_0_100?.toString() || "",
        velocidad_maxima: initialData.velocidad_maxima?.toString() || "",
        tiempo_carga_dc: initialData.tiempo_carga_dc?.toString() || "",
        tiempo_carga_ac: initialData.tiempo_carga_ac?.toString() || "",
        largo_mm: initialData.largo_mm?.toString() || "",
        ancho_mm: initialData.ancho_mm?.toString() || "",
        alto_mm: initialData.alto_mm?.toString() || "",
        distancia_ejes_mm: initialData.distancia_ejes_mm?.toString() || "",
        peso_kg: initialData.peso_kg?.toString() || "",
        capacidad_maletero_l:
          initialData.capacidad_maletero_l?.toString() || "",
        colores_disponibles: initialData.colores_disponibles?.join(", ") || "",
        seguridad: initialData.seguridad?.join(", ") || "",
        interior: initialData.interior?.join(", ") || "",
        exterior: initialData.exterior?.join(", ") || "",
        tecnologia: initialData.tecnologia?.join(", ") || "",
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numericFields = [
      "año",
      "precio_costo",
      "precio_venta",
      "autonomia_km",
      "potencia_hp",
      "capacidad_bateria_kwh",
      "numero_pasajeros",
      "torque_nm",
      "aceleracion_0_100",
      "velocidad_maxima",
      "tiempo_carga_dc",
      "tiempo_carga_ac",
      "largo_mm",
      "ancho_mm",
      "alto_mm",
      "distancia_ejes_mm",
      "peso_kg",
      "capacidad_maletero_l",
    ];
    const arrayFields = [
      "colores_disponibles",
      "seguridad",
      "interior",
      "exterior",
      "tecnologia",
    ];

    const vehicleData: { [key: string]: any } = { ...formData };

    numericFields.forEach((field) => {
      if (vehicleData[field]) vehicleData[field] = Number(vehicleData[field]);
    });

    arrayFields.forEach((field) => {
      if (typeof vehicleData[field] === "string") {
        vehicleData[field] = vehicleData[field]
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);
      }
    });

    vehicleData.bodegaId = formData.bodegaId ? Number(formData.bodegaId) : null;

    try {
      const vehicleResponse = isEditing
        ? await apiClient.patch(`/vehicles/${initialData?.id}`, vehicleData)
        : await apiClient.post("/vehicles", vehicleData);
      const vehicleId = vehicleResponse.data.id;

      if (selectedFiles.length > 0) {
        const uploadFormData = new FormData();
        selectedFiles.forEach((file) => uploadFormData.append("files", file));
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
      setError(
        Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage
      );
      toast.error(
        Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage
      );
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    const selectedProfile = profiles.find((p) => p.id === Number(profileId));

    if (selectedProfile) {
      setFormData((prev) => ({
        ...prev,
        profileId,
        // Datos básicos
        marca: selectedProfile.marca,
        modelo: selectedProfile.modelo,
        categoria: selectedProfile.categoria || "",
        traccion: selectedProfile.traccion || "",
        numero_pasajeros: selectedProfile.numero_pasajeros?.toString() || "5",
        
        // Rendimiento y Batería
        potencia_hp: selectedProfile.potencia_hp.toString(),
        autonomia_km: selectedProfile.autonomia_km.toString(),
        capacidad_bateria_kwh: selectedProfile.capacidad_bateria_kwh.toString(),
        torque_nm: selectedProfile.torque_nm?.toString() || "",
        aceleracion_0_100: selectedProfile.aceleracion_0_100?.toString() || "",
        velocidad_maxima: selectedProfile.velocidad_maxima?.toString() || "",

        // Dimensiones y Peso
        largo_mm: selectedProfile.largo_mm?.toString() || "",
        ancho_mm: selectedProfile.ancho_mm?.toString() || "",
        alto_mm: selectedProfile.alto_mm?.toString() || "",
        distancia_ejes_mm: selectedProfile.distancia_ejes_mm?.toString() || "",
        peso_kg: selectedProfile.peso_kg?.toString() || "",
        capacidad_maletero_l:
          selectedProfile.capacidad_maletero_l?.toString() || "",
      }));
    } else {
      // Si se deselecciona, limpiar los campos
      resetForm();
    }
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

      {/* --- SECCIÓN PRINCIPAL --- */}
      <input
        name="marca"
        value={formData.marca}
        onChange={handleChange}
        placeholder="Marca"
        required
        className={styles.formInput}
      />
      <input
        name="modelo"
        value={formData.modelo}
        onChange={handleChange}
        placeholder="Modelo"
        required
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
        placeholder="Color Principal"
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

      <select
        name="categoria"
        value={formData.categoria}
        onChange={handleChange}
        className={styles.formSelect}
      >
        <option value="">-- Categoría --</option>
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
        <option value="">-- Tracción --</option>
        <option value="4x2">4x2</option>
        <option value="4x4">4x4</option>
        <option value="AWD">AWD</option>
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

      {/* --- 👇 INICIO DE LA CORRECCIÓN: Conectar inputs con el estado 👇 --- */}
      <details className={styles.formSection} open>
        <summary>Rendimiento y Batería</summary>
        <div className={styles.sectionContent}>
          <input
            name="potencia_hp"
            value={formData.potencia_hp}
            onChange={handleChange}
            placeholder="Potencia (HP)"
            className={styles.formInput}
          />
          <input
            name="torque_nm"
            value={formData.torque_nm}
            onChange={handleChange}
            placeholder="Torque (Nm)"
            className={styles.formInput}
          />
          <input
            name="aceleracion_0_100"
            value={formData.aceleracion_0_100}
            onChange={handleChange}
            placeholder="Aceleración 0-100 km/h (s)"
            className={styles.formInput}
          />
          <input
            name="velocidad_maxima"
            value={formData.velocidad_maxima}
            onChange={handleChange}
            placeholder="Velocidad Máxima (km/h)"
            className={styles.formInput}
          />
          <input
            name="autonomia_km"
            value={formData.autonomia_km}
            onChange={handleChange}
            placeholder="Autonomía (km)"
            className={styles.formInput}
          />
          <input
            name="capacidad_bateria_kwh"
            value={formData.capacidad_bateria_kwh}
            onChange={handleChange}
            placeholder="Batería (kWh)"
            className={styles.formInput}
          />
          <input
            name="tiempo_carga_ac"
            value={formData.tiempo_carga_ac}
            onChange={handleChange}
            placeholder="Tiempo Carga AC (horas)"
            className={styles.formInput}
          />
          <input
            name="tiempo_carga_dc"
            value={formData.tiempo_carga_dc}
            onChange={handleChange}
            placeholder="Tiempo Carga DC (mins)"
            className={styles.formInput}
          />
        </div>
      </details>

      <details className={styles.formSection} open>
        <summary>Dimensiones y Peso</summary>
        <div className={styles.sectionContent}>
          <input
            name="largo_mm"
            value={formData.largo_mm}
            onChange={handleChange}
            placeholder="Largo (mm)"
            className={styles.formInput}
          />
          <input
            name="ancho_mm"
            value={formData.ancho_mm}
            onChange={handleChange}
            placeholder="Ancho (mm)"
            className={styles.formInput}
          />
          <input
            name="alto_mm"
            value={formData.alto_mm}
            onChange={handleChange}
            placeholder="Alto (mm)"
            className={styles.formInput}
          />
          <input
            name="distancia_ejes_mm"
            value={formData.distancia_ejes_mm}
            onChange={handleChange}
            placeholder="Distancia entre ejes (mm)"
            className={styles.formInput}
          />
          <input
            name="peso_kg"
            value={formData.peso_kg}
            onChange={handleChange}
            placeholder="Peso (kg)"
            className={styles.formInput}
          />
          <input
            name="capacidad_maletero_l"
            value={formData.capacidad_maletero_l}
            onChange={handleChange}
            placeholder="Maletero (L)"
            className={styles.formInput}
          />
        </div>
      </details>
      {/* --- 👆 FIN DE LA CORRECCIÓN --- */}

      <p className={styles.helperText}>
        Para las siguientes secciones, separa cada característica con una coma
        (,).
      </p>
      <textarea
        name="colores_disponibles"
        value={formData.colores_disponibles}
        onChange={handleChange}
        placeholder="Colores Disponibles (Rojo, Azul...)"
        className={styles.formTextarea}
      />
      <textarea
        name="seguridad"
        value={formData.seguridad}
        onChange={handleChange}
        placeholder="Características de Seguridad..."
        className={styles.formTextarea}
      />
      <textarea
        name="interior"
        value={formData.interior}
        onChange={handleChange}
        placeholder="Características Interiores..."
        className={styles.formTextarea}
      />
      <textarea
        name="exterior"
        value={formData.exterior}
        onChange={handleChange}
        placeholder="Características Exteriores..."
        className={styles.formTextarea}
      />
      <textarea
        name="tecnologia"
        value={formData.tecnologia}
        onChange={handleChange}
        placeholder="Características de Tecnología..."
        className={styles.formTextarea}
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