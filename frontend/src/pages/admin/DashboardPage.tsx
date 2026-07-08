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
import { useConfirm } from "@/components/ConfirmDialog";
import { exportToExcel } from "@/utils/exportExcel";

// Interfaz para el tipo de dato Vehicle

export const DashboardPage = () => {
  const confirm = useConfirm();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [historialVehicle, setHistorialVehicle] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
    const ok = await confirm({
      title: "Eliminar vehículo",
      message: `¿Eliminar el vehículo #${id}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
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
    // Orden por columna
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortKey], bv = (b as any)[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "es", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [vehicles, search, filterEstado, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const exportar = () => {
    const rows = filtered.map(v => ({
      ID: v.id, Marca: v.marca, Modelo: v.modelo, Año: v.año, VIN: v.vin,
      Color: v.color, Ubicación: v.bodega?.nombre || "N/A", Estado: v.estado,
      "Precio costo": v.precio_costo, "Precio venta": v.precio_venta,
      "Precio USD": v.precio_venta_usd ?? "", Visibilidad: v.visibilidad,
      Clasificación: v.clasificacion_inventario ?? "",
    }));
    exportToExcel(rows, "Inventario", "Inventario");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <>
      <div className={styles.header}>
        <h1>Inventario de Vehículos</h1>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button className="btn" onClick={exportar} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#334155" }} title="Exportar a Excel">
            📊 Exportar Excel
          </button>
          <button className="btn btn-principal" onClick={handleOpenCreateModal}>
            Añadir Vehículo
          </button>
        </div>
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
              <Th label="ID" col="id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="Marca" col="marca" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="Modelo" col="modelo" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="Año" col="año" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th>VIN</th>
              <th>Ubicación</th>
              <Th label="Estado" col="estado" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
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
                    estado={(vehicle.estado as any) ?? "Disponible"}
                    onEstadoChanged={(val) =>
                      setVehicles(prev =>
                        prev.map(v => v.id === vehicle.id ? { ...v, estado: val } : v)
                      )
                    }
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

// Encabezado de columna ordenable
const Th = ({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void;
}) => (
  <th onClick={() => onSort(col)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} title="Ordenar">
    {label}
    <span style={{ marginLeft: 4, opacity: sortKey === col ? 1 : 0.25 }}>
      {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  </th>
);
