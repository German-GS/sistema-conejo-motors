import { getImageUrl } from "@/utils/imageUrl";
import { useState, useEffect, useMemo } from "react";
import apiClient from "../../api/apiClient";
import { VehicleForm } from "../../components/VechicleForm/VehicleForm";
import { Card } from "../../components/Card";
import styles from "./DashboardPage.module.css";
import { Modal } from "../../components/Modal";
import toast from "react-hot-toast";
import { Vehicle } from "../../interfaces";
import { Pagination } from "@/components/Pagination";
import { VisibilityButtons } from "@/components/VisibilityButtons";
import { VehicleRibbon } from "@/components/VehicleRibbon";
import { VehicleHistorialModal } from "@/components/VehicleHistorialModal";

// Interfaz para el tipo de dato Vehicle

export const DashboardPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [historialVehicle, setHistorialVehicle] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

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
    try {
      await apiClient.delete(`/vehicles/${id}`);
      toast.success("Vehículo eliminado con éxito."); // <-- 2. Reemplaza alert
      fetchVehicles();
    } catch (err) {
      const errorMessage = "Error al eliminar el vehículo.";
      setError(errorMessage);
      toast.error(errorMessage); // <-- 3. Añade toast de error
      console.error(err);
    }
  };

  // Clasificación de inventario: solo "En Stock" cuenta como stock activo
  const esEspecial = (v: Vehicle) => {
    const c = v.clasificacion_inventario;
    if (c) return c !== 'En Stock';
    // Compatibilidad con datos antiguos (antes de la migración)
    return v.visibilidad === 'Agotado' || v.visibilidad === 'Contrapedido';
  };
  const stockActivo = useMemo(() =>
    vehicles.filter(v => v.estado === 'Disponible' && !esEspecial(v)).length,
  [vehicles]);
  const especiales = useMemo(() =>
    vehicles.filter(esEspecial),
  [vehicles]);

  const filtered = useMemo(() => {
    let list = vehicles;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => `${v.marca} ${v.modelo} ${v.año} ${v.vin} ${v.color}`.toLowerCase().includes(q));
    }
    if (filterEstado) list = list.filter(v => v.estado === filterEstado);
    return list;
  }, [vehicles, search, filterEstado]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <>
      <div className={styles.header}>
        <h1>Inventario de Vehículos</h1>
        <button className="btn btn-principal" onClick={handleOpenCreateModal}>
          Añadir Vehículo
        </button>
      </div>

      <Card title={
        <span>
          Inventario ({stockActivo} en stock activo
          {especiales.length > 0 && (
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 400, marginLeft: "0.5rem" }}>
              · {especiales.length} fuera de inventario
              {especiales.map(v => ` (${v.modelo} — ${v.clasificacion_inventario ?? v.visibilidad})`).join(",")}
            </span>
          )}
          )
        </span>
      }>
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Filtros rápidos */}
        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="🔍 Buscar por marca, modelo, VIN, color..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
            className={styles.filterSelect}
          >
            <option value="">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Reservado">Reservado</option>
            <option value="Vendido">Vendido</option>
          </select>
          {(search || filterEstado) && (
            <button
              className={styles.clearBtn}
              onClick={() => { setSearch(""); setFilterEstado(""); setPage(1); }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

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
              <th>Visibilidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((vehicle) => (
              <tr key={vehicle.id}>
                <td>
                  <div className={styles.thumbWrapper}>
                    {vehicle.profile?.imagenes && vehicle.profile.imagenes.length > 0 ? (
                      <img
                        src={getImageUrl(
                          [...vehicle.profile.imagenes].sort((a, b) => a.order - b.order)[0].url
                        )}
                        alt={`${vehicle.marca} ${vehicle.modelo}`}
                        className={styles.thumbnail}
                      />
                    ) : (
                      <div className={styles.noImage}>Sin foto</div>
                    )}
                    <VehicleRibbon visibilidad={vehicle.visibilidad} clasificacion={vehicle.clasificacion_inventario} />
                  </div>
                </td>
                <td>{vehicle.id}</td>
                <td>{vehicle.marca}</td>
                <td>{vehicle.modelo}</td>
                <td>{vehicle.año}</td>
                <td>{vehicle.vin}</td>
                <td>{vehicle.bodega?.nombre || "N/A"}</td>
                <td>{vehicle.estado}</td>
                <td>
                  <VisibilityButtons
                    vehicleId={vehicle.id}
                    current={vehicle.visibilidad ?? "Visible"}
                    clasificacion={vehicle.clasificacion_inventario ?? "En Stock"}
                    onChanged={(val) =>
                      setVehicles(prev =>
                        prev.map(v => v.id === vehicle.id ? { ...v, visibilidad: val } : v)
                      )
                    }
                    onClasificacionChanged={(val) =>
                      setVehicles(prev =>
                        prev.map(v => v.id === vehicle.id ? { ...v, clasificacion_inventario: val } : v)
                      )
                    }
                  />
                </td>
                <td>
                  <button onClick={() => handleOpenEditModal(vehicle)}>
                    Editar
                  </button>
                  <button onClick={() => setHistorialVehicle(vehicle)} title="Historial de estados">
                    🕓
                  </button>
                  <button onClick={() => handleDelete(vehicle.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          totalItems={filtered.length}
        />
      </Card>

      {/* Este es el modal que se mostrará al hacer clic */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingVehicle ? "Editar Vehículo" : "Añadir Nuevo Vehículo"}
      >
        <VehicleForm onSuccess={handleSuccess} initialData={editingVehicle} />
      </Modal>

      <VehicleHistorialModal
        vehicleId={historialVehicle?.id ?? null}
        vehicleLabel={historialVehicle ? `${historialVehicle.marca} ${historialVehicle.modelo}` : undefined}
        onClose={() => setHistorialVehicle(null)}
      />
    </>
  );
};
