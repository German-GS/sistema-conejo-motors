import { getImageUrl } from "@/utils/imageUrl";
// frontend/src/components/VechicleForm/VehicleForm.tsx
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
import {
  Bodega,
  VehicleProfile,
  Vehicle,
  ProfileImage as Image, // Renombramos ProfileImage a Image para claridad local
} from "../../interfaces"; // Importamos ProfileImage y la renombramos

// Asegúrate que la interfaz Vehicle importada incluye 'imagenes' y 'profile' con sus 'imagenes'
// interface Vehicle {
//   id: number;
//   // ... otros campos
//   imagenes?: Image[]; // Imágenes de la INSTANCIA (copias ordenables)
//   profile?: {
//     id: number;
//     imagenes?: Image[]; // Imágenes originales del PERFIL
//     // ...otros campos del perfil
//   };
//   // ... otros campos como bodega, etc.
// }

interface VehicleFormProps {
  onSuccess: () => void;
  initialData?: Vehicle | null; // Usamos la interfaz Vehicle importada
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  onSuccess,
  initialData,
}) => {
  console.log("Initial Data Received:", initialData); // Mantenemos el log para depuración
  const [formData, setFormData] = useState({
    profileId: "",
    marca: "", // Aunque viene del perfil, lo mantenemos por si acaso
    modelo: "", // Aunque viene del perfil, lo mantenemos por si acaso
    año: "",
    vin: "",
    color: "",
    precio_costo: "",
    precio_venta: "",
    bodegaId: "",
  });

  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [error, setError] = useState("");
  const isEditing = !!initialData;

  // Estado para las imágenes de la INSTANCIA que se pueden reordenar
  const [currentImages, setCurrentImages] = useState<Image[]>([]);

  // Efecto para cargar datos iniciales como bodegas y perfiles (solo una vez al montar)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bodegasRes, profilesRes] = await Promise.all([
          apiClient.get("/bodegas"),
          apiClient.get("/vehicle-profiles"), // Asume que este endpoint devuelve perfiles con sus imágenes
        ]);
        setBodegas(bodegasRes.data);
        setProfiles(profilesRes.data);
      } catch (err) {
        toast.error("No se pudieron cargar los perfiles y bodegas.");
      }
    };
    fetchData();
  }, []); // <-- Array de dependencias vacío para ejecutar solo al montar

  // Función para resetear solo los campos del formulario
  const resetFormFields = () => {
    setFormData({
      profileId: "",
      marca: "",
      modelo: "",
      año: "",
      vin: "",
      color: "",
      precio_costo: "",
      precio_venta: "",
      bodegaId: "",
    });
    // NO reseteamos currentImages aquí
    setError("");
  };

  // Efecto para llenar/resetear el formulario basado en initialData
  useEffect(() => {
    if (isEditing && initialData) {
      // --- Modo Edición ---
      setFormData({
        profileId: initialData.profile?.id?.toString() || "",
        marca: initialData.marca || "",
        modelo: initialData.modelo || "",
        año: initialData.año?.toString() || "",
        vin: initialData.vin || "",
        color: initialData.color || "",
        precio_costo: initialData.precio_costo?.toString() || "",
        precio_venta: initialData.precio_venta?.toString() || "",
        bodegaId: initialData.bodega?.id?.toString() || "",
      });
      console.log("Loading instance images:", initialData.imagenes);
      // Carga las imágenes de la instancia (ordenadas por el backend)
      setCurrentImages(initialData.imagenes || []);
      setError(""); // Limpia error al cargar datos de edición
    } else {
      // --- Modo Creación (al montar o si initialData cambia a null) ---
      resetFormFields(); // Resetea solo los campos del formulario
      setCurrentImages([]); // Asegura que las imágenes estén vacías al inicio de la creación
      console.log("Form reset for creation.");
    }
    // Depende solo de initialData y isEditing
  }, [initialData, isEditing]);

  // Manejador genérico para cambios en inputs y selects
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador para el cambio de Perfil (SOLO MODO CREACIÓN)
  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    const selectedProfile = profiles.find((p) => p.id === Number(profileId));

    // Actualiza el profileId en el estado del formulario
    setFormData((prev) => ({
      ...prev,
      profileId,
      // Opcional: autocompletar marca/modelo si quieres
      // marca: selectedProfile?.marca || "",
      // modelo: selectedProfile?.modelo || "",
    }));

    // Carga las imágenes del perfil seleccionado DIRECTAMENTE en currentImages para vista previa
    if (selectedProfile) {
      console.log(
        "Profile selected, setting images:",
        selectedProfile.imagenes
      ); // Log
      setCurrentImages(selectedProfile.imagenes || []);
    } else {
      console.log("No profile selected, clearing images."); // Log
      setCurrentImages([]); // Limpia las imágenes si se deselecciona
    }
  };

  // Manejador para finalizar el arrastre de imágenes
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    // Si no hay destino o es el mismo lugar, no hacer nada
    if (!destination || destination.index === source.index) {
      return;
    }
    // Crea una copia del array actual de imágenes
    const items = Array.from(currentImages);
    // Remueve el elemento de su posición original
    const [reorderedItem] = items.splice(source.index, 1);
    // Inserta el elemento en la nueva posición
    items.splice(destination.index, 0, reorderedItem);
    // Actualiza el estado con el nuevo orden
    setCurrentImages(items);
  };

  // Manejador botón "X" (informativo)
  const handleRemoveImage = (imageId: number) => {
    toast(
      "La gestión (añadir/eliminar) de imágenes se realiza en la Configuración de Perfiles.",
      { icon: "ℹ️" }
    );
  };

  // Manejador para enviar el formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Prepara el payload base (solo campos editables de la instancia)
    const vehiclePayload: { [key: string]: any } = {
      año: formData.año ? Number(formData.año) : null,
      vin: formData.vin, // Vin se envía pero está deshabilitado
      color: formData.color,
      precio_costo: formData.precio_costo
        ? Number(formData.precio_costo)
        : null,
      precio_venta: formData.precio_venta
        ? Number(formData.precio_venta)
        : null,
      bodegaId: formData.bodegaId ? Number(formData.bodegaId) : null,
      // NO se envía profileId, marca, modelo en la actualización del VEHÍCULO
    };

    try {
      if (isEditing && initialData?.id) {
        // --- Modo Edición ---
        // 1. Actualiza los datos principales del vehículo
        await apiClient.patch(`/vehicles/${initialData.id}`, vehiclePayload);
        toast.success("Datos del vehículo actualizados.");

        const imagesNewOrder = currentImages.map((img, index) => ({
          id: img.id, // ID de VehicleProfileImage
          order: index,
        }));

        // 3. Llama al nuevo endpoint de reordenamiento del perfil
        if (initialData.profile?.id && imagesNewOrder.length > 0) {
          // Asegura que hay perfil y imágenes
          await apiClient.patch(
            `/vehicle-profiles/${initialData.profile.id}/images/reorder`,
            { images: imagesNewOrder } // Envía el array dentro de un objeto 'images'
          );
          toast.success("Orden de imágenes guardado.");
        }

        onSuccess();
        // --- Fin Modo Edición ---
      } else {
        // --- Modo Creación ---
        if (!formData.profileId) {
          toast.error("Debes seleccionar un perfil para crear el vehículo.");
          setError("Selecciona un perfil.");
          return; // Detiene la ejecución si no hay perfil
        }
        vehiclePayload.profileId = Number(formData.profileId);
        // El backend ahora copia las imágenes al crear
        await apiClient.post("/vehicles", vehiclePayload);
        // --- Fin Modo Creación ---
      }

      toast.success(
        `Vehículo ${isEditing ? "actualizado" : "creado"} con éxito.`
      );
      onSuccess(); // Llama a la función onSuccess (refrescar lista y cerrar modal)
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

  // --- RENDERIZADO DEL FORMULARIO ---
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Selector de Perfil */}
      <select
        name="profileId"
        value={formData.profileId}
        onChange={handleProfileChange} // Llama a la función correcta
        className={styles.profileSelector}
        disabled={isEditing} // Deshabilitado al editar
        required={!isEditing} // Requerido solo al crear
      >
        <option value="">-- Seleccionar Perfil (solo al crear) --</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.marca} - {profile.modelo}
          </option>
        ))}
      </select>

      {/* Inputs para datos específicos de la instancia */}
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
        placeholder="VIN (Número de Chasis)"
        required
        disabled={isEditing} // VIN no se puede cambiar
        className={styles.formInput}
      />
      <input
        name="color"
        value={formData.color}
        onChange={handleChange}
        placeholder="Color Específico"
        required
        className={styles.formInput}
      />
      <input
        name="precio_costo"
        type="number"
        step="0.01" // Permite decimales
        value={formData.precio_costo}
        onChange={handleChange}
        placeholder="Precio de Costo"
        required
        className={styles.formInput}
      />
      <input
        name="precio_venta"
        type="number"
        step="0.01" // Permite decimales
        value={formData.precio_venta}
        onChange={handleChange}
        placeholder="Precio de Venta"
        required
        className={styles.formInput}
      />

      {/* Selector de Bodega */}
      <select
        name="bodegaId"
        value={formData.bodegaId}
        onChange={handleChange}
        className={styles.formSelect}
      >
        <option value="">-- Asignar Ubicación --</option>
        {bodegas.map((bodega) => (
          <option key={bodega.id} value={bodega.id}>
            {bodega.nombre}
          </option>
        ))}
      </select>

      {/* Sección de Drag and Drop */}
      {/* Se muestra si hay imágenes (ya sea de instancia en edición o de perfil en creación) */}
      {currentImages.length > 0 && (
        <div className={styles.existingImagesSection}>
          {/* Título dinámico */}
          <h3>
            {isEditing
              ? "Imágenes (Arrastra para ordenar)"
              : "Imágenes del Perfil (Vista Previa)"}
          </h3>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="image-list" direction="horizontal">
              {(provided) => (
                <div
                  className={styles.existingImagesGrid}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {currentImages.map((image, index) => (
                    <Draggable
                      // Usamos image.id si existe (edición), sino el índice (creación)
                      key={image.id ? image.id.toString() : `new-${index}`}
                      draggableId={
                        image.id ? image.id.toString() : `new-${index}`
                      }
                      index={index}
                      // Deshabilitamos el arrastre si estamos creando (son solo vista previa)
                      isDragDisabled={!isEditing}
                    >
                      {(provided) => (
                        <div
                          className={styles.existingImageItem}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          // Añadimos un estilo visual si no se puede arrastrar
                          style={{
                            ...provided.draggableProps.style,
                            cursor: isEditing ? "grab" : "default", // Cambia el cursor
                          }}
                        >
                          <img
                            src={getImageUrl(image.url)}
                            alt={`Imagen ${index + 1}`}
                          />
                          {/* Mostramos el botón "X" solo en modo edición */}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.id)}
                              className={styles.removeImageButton}
                              title="Gestionar imágenes en Configuración > Perfiles"
                            >
                              X
                            </button>
                          )}
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
      {/* Fin Sección Drag and Drop */}

      {/* Botón de Envío */}
      <button
        type="submit"
        className="btn btn-principal"
        style={{ gridColumn: "1 / -1", marginTop: "1rem" }} // Añade margen superior
      >
        {isEditing ? "Actualizar Vehículo" : "Crear Vehículo"}
      </button>

      {/* Mensaje de Error */}
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
};
