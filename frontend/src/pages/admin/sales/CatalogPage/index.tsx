import { getImageUrl } from "@/utils/imageUrl";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "./CatalogPage.module.css";
import { Pagination } from "@/components/Pagination";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";
import toast from "react-hot-toast";
import { VehicleRibbon } from "@/components/VehicleRibbon";

interface VehiculoReservado {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  cotizacion: {
    id: number;
    cliente: string;
    vendedor: string;
    fecha_creacion: string;
    fecha_expiracion: string;
    estado: string;
  } | null;
}

interface CatalogVehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  precio_venta: number;
  precio_venta_final: number | null;
  descuento_porcentaje: number | null;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  categoria?: string;
  visibilidad?: "Visible" | "Oculto" | "Agotado" | "Contrapedido";
  imagenes?: { url: string }[];
  bodega?: { nombre: string };
}

const fmtCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);

export const CatalogPage = () => {
  const [vehicles, setVehicles] = useState<CatalogVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin") ? "/admin/sales" : "/sales";
  const isAdmin = location.pathname.startsWith("/admin");

  // Panel de reservados (solo admin)
  const [reservados, setReservados] = useState<VehiculoReservado[]>([]);
  const [liberando, setLiberando] = useState<number | null>(null);

  const fetchReservados = useCallback(() => {
    if (!isAdmin) return;
    apiClient.get("/vehicles/reservados")
      .then(res => setReservados(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [isAdmin]);

  const liberarVehiculo = async (id: number, marca: string, modelo: string) => {
    if (!confirm(`¿Liberar el ${marca} ${modelo} y marcarlo como Disponible?`)) return;
    setLiberando(id);
    try {
      await apiClient.patch(`/vehicles/${id}/liberar`);
      toast.success(`✅ ${marca} ${modelo} liberado y disponible nuevamente.`);
      fetchReservados();
      // Recargar catálogo para que aparezca
      apiClient.get("/vehicles/sales/catalog")
        .then(res => setVehicles(res.data))
        .catch(() => {});
    } catch {
      toast.error("No se pudo liberar el vehículo.");
    } finally {
      setLiberando(null);
    }
  };

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterBodega, setFilterBodega] = useState("");
  const [soloDescuento, setSoloDescuento] = useState(false);
  const [sortBy, setSortBy] = useState<"precio_asc" | "precio_desc" | "autonomia" | "">("");

  useEffect(() => {
    apiClient.get("/vehicles/sales/catalog")
      .then((res) => setVehicles(res.data))
      .catch(() => setError("No se pudo cargar el catálogo."))
      .finally(() => setLoading(false));
    fetchReservados();
  }, [fetchReservados]);

  const categorias = useMemo(() => [...new Set(vehicles.map(v => v.categoria).filter(Boolean))], [vehicles]);
  const bodegas = useMemo(() => [...new Set(vehicles.map(v => v.bodega?.nombre).filter(Boolean))], [vehicles]);

  const filtered = useMemo(() => {
    let list = [...vehicles];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => `${v.marca} ${v.modelo} ${v.año} ${v.color}`.toLowerCase().includes(q));
    }
    if (filterCategoria) list = list.filter(v => v.categoria === filterCategoria);
    if (filterBodega)    list = list.filter(v => v.bodega?.nombre === filterBodega);
    if (soloDescuento)   list = list.filter(v => Number(v.descuento_porcentaje) > 0);
    if (sortBy === "precio_asc")  list.sort((a, b) => Number(a.precio_venta_final ?? a.precio_venta) - Number(b.precio_venta_final ?? b.precio_venta));
    if (sortBy === "precio_desc") list.sort((a, b) => Number(b.precio_venta_final ?? b.precio_venta) - Number(a.precio_venta_final ?? a.precio_venta));
    if (sortBy === "autonomia")   list.sort((a, b) => Number(b.autonomia_km) - Number(a.autonomia_km));
    return list;
  }, [vehicles, search, filterCategoria, filterBodega, soloDescuento, sortBy]);

  const resetFilters = () => {
    setSearch(""); setFilterCategoria(""); setFilterBodega("");
    setSoloDescuento(false); setSortBy(""); setPage(1);
  };
  const hasFilters = search || filterCategoria || filterBodega || soloDescuento || sortBy;

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  if (loading) return <p>Cargando catálogo...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div>
      <div className={styles.topBar}>
        <h1>Catálogo de Vehículos</h1>
        <span className={styles.count}>{filtered.length} de {vehicles.length} vehículos</span>
      </div>

      {/* ── Panel de Reservados (solo admin) ───────────────────────────── */}
      {isAdmin && reservados.length > 0 && (
        <div className={styles.reservadosPanel}>
          <div className={styles.reservadosHeader}>
            <span className={styles.reservadosTitle}>
              🔖 Vehículos Reservados ({reservados.length})
            </span>
            <span className={styles.reservadosHint}>
              Tienen cotización activa. Libéralos si el negocio no prosperó.
            </span>
          </div>
          <div className={styles.reservadosGrid}>
            {reservados.map((v) => {
              const expirado = v.cotizacion && new Date(v.cotizacion.fecha_expiracion) < new Date();
              return (
                <div key={v.id} className={`${styles.reservadoCard} ${expirado ? styles.reservadoExpirado : ""}`}>
                  <div className={styles.reservadoInfo}>
                    <strong>{v.marca} {v.modelo} ({v.año})</strong>
                    <span className={styles.reservadoColor}>{v.color}</span>
                  </div>
                  {v.cotizacion ? (
                    <div className={styles.cotizacionInfo}>
                      <span>👤 {v.cotizacion.cliente}</span>
                      <span>🧑‍💼 {v.cotizacion.vendedor}</span>
                      <span>
                        📅 Cotiz. #{v.cotizacion.id} — {fmtFecha(v.cotizacion.fecha_creacion)}
                      </span>
                      <span className={expirado ? styles.expiradoText : ""}>
                        {expirado ? "⚠️ Venció" : "⏳ Vence"}: {fmtFechaLocal(String(v.cotizacion.fecha_expiracion))}
                      </span>
                    </div>
                  ) : (
                    <div className={styles.cotizacionInfo}>
                      <span className={styles.expiradoText}>Sin cotización vinculada</span>
                    </div>
                  )}
                  <div className={styles.reservadoActions}>
                    {v.cotizacion ? (
                      <Link to={`/admin/sales/quotes/${v.cotizacion.id}`} className={styles.verCotBtn}>
                        Ver Cotización →
                      </Link>
                    ) : (
                      <span className={styles.verCotBtn} style={{ opacity: 0.4, cursor: "default" }}>
                        Sin cotización
                      </span>
                    )}
                    <button
                      className={styles.liberarBtn}
                      onClick={() => liberarVehiculo(v.id, v.marca, v.modelo)}
                      disabled={liberando === v.id}
                    >
                      {liberando === v.id ? "Liberando..." : "🔓 Liberar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel de filtros */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="🔍 Buscar por marca, modelo, color..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.select} value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className={styles.select} value={filterBodega} onChange={(e) => setFilterBodega(e.target.value)}>
          <option value="">Todas las bodegas</option>
          {bodegas.map(b => <option key={b}>{b}</option>)}
        </select>
        <select className={styles.select} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="">Ordenar por...</option>
          <option value="precio_asc">Precio ↑</option>
          <option value="precio_desc">Precio ↓</option>
          <option value="autonomia">Mayor autonomía</option>
        </select>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={soloDescuento} onChange={(e) => setSoloDescuento(e.target.checked)} />
          Solo con descuento
        </label>
        {hasFilters && (
          <button className={styles.resetBtn} onClick={resetFilters}>✕ Limpiar</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noResults}>
          <p>🔍 Ningún vehículo coincide con los filtros aplicados.</p>
          <button className={styles.resetBtn} onClick={resetFilters}>Limpiar filtros</button>
        </div>
      ) : (
        <div className={styles.catalogGrid}>
          {paginated.map((vehicle) => (
            <div key={vehicle.id} className={styles.vehicleCard}>
              <div className={styles.imgWrap}>
                <img
                  src={vehicle.imagenes?.[0] ? getImageUrl(vehicle.imagenes[0].url) : "/placeholder.png"}
                  alt={`${vehicle.marca} ${vehicle.modelo}`}
                  className={styles.vehicleImage}
                />
                {Number(vehicle.descuento_porcentaje) > 0 && (
                  <span className={styles.discountBadge}>−{vehicle.descuento_porcentaje}%</span>
                )}
                {vehicle.categoria && (
                  <span className={styles.catBadge}>{vehicle.categoria}</span>
                )}
                <VehicleRibbon visibilidad={vehicle.visibilidad} />
              </div>
              <div className={styles.vehicleInfo}>
                <h3>{vehicle.marca} {vehicle.modelo} ({vehicle.año})</h3>
                <p className={styles.price}>
                  {fmtCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}
                </p>
                {Number(vehicle.descuento_porcentaje) > 0 && (
                  <p className={styles.oldPrice}>{fmtCRC(Number(vehicle.precio_venta))}</p>
                )}
                <div className={styles.specs}>
                  <span title="Batería">🔋 {vehicle.capacidad_bateria_kwh} kWh</span>
                  <span title="Potencia">⚡ {vehicle.potencia_hp} HP</span>
                  <span title="Autonomía">🛣️ {vehicle.autonomia_km} km</span>
                </div>
                <div className={styles.meta}>
                  <span>{vehicle.color}</span>
                  {vehicle.bodega && <span>📍 {vehicle.bodega.nombre}</span>}
                </div>
                <Link to={`${basePath}/catalog/${vehicle.id}`} className="btn btn-principal">
                  Ver Detalles
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        pageSize={pageSize}
        onPageSize={(s) => setPageSize(s)}
        totalItems={filtered.length}
      />
    </div>
  );
};
