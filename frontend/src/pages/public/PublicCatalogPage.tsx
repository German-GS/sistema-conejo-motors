import { getImageUrl } from "@/utils/imageUrl";
// src/pages/public/PublicCatalogPage.tsx
import { useState, useEffect, useMemo } from "react";
import { VehicleRibbon } from "@/components/VehicleRibbon";
import { Link } from "react-router-dom";
import apiClient from "@/api/apiClient";
import styles from "@/pages/admin/sales/CatalogPage/CatalogPage.module.css";
import filterStyles from "./PublicCatalogPage.module.css";
import stylesLayout from "@/components/PublicLayout/PublicLayout.module.css";
import { Pagination } from "@/components/Pagination";
import { SeoHead } from "@/components/SeoHead";

interface CatalogVehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  precio_venta: number;
  precio_venta_usd?: number;
  precio_venta_final: number | null;
  descuento_porcentaje: number | null;
  autonomia_km: number | null;
  imagenes?: { url: string }[];
  profile?: { imagenes?: { url: string }[] };
  categoria?: string;
}

const formatCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value);

const PRICE_MAX_DEFAULT = 60_000_000;

export const PublicCatalogPage = () => {
  const [allVehicles, setAllVehicles] = useState<CatalogVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterCategoria, setFilterCategoria] = useState<string>("Todas");
  const [filterPrecioMax, setFilterPrecioMax] = useState<number>(PRICE_MAX_DEFAULT);
  const [filterAutonomiaMin, setFilterAutonomiaMin] = useState<number>(0);
  const [filterMarca, setFilterMarca] = useState<string>("Todas");
  const [filterColor, setFilterColor] = useState<string>("Todos");

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await apiClient.get<CatalogVehicle[]>("/vehicles/sales/catalog");
        setAllVehicles(response.data);
      } catch (err) {
        console.error("No se pudo cargar el catálogo.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Opciones únicas para los selects
  const categorias = useMemo(() => {
    const set = new Set(allVehicles.map((v) => v.categoria || "Sin Categoría"));
    return ["Todas", ...Array.from(set).sort()];
  }, [allVehicles]);

  const marcas = useMemo(() => {
    const set = new Set(allVehicles.map((v) => v.marca));
    return ["Todas", ...Array.from(set).sort()];
  }, [allVehicles]);

  const colores = useMemo(() => {
    const set = new Set(allVehicles.map((v) => v.color).filter(Boolean));
    return ["Todos", ...Array.from(set).sort()];
  }, [allVehicles]);

  // Precio máximo real en la lista
  const precioMaxReal = useMemo(() => {
    if (!allVehicles.length) return PRICE_MAX_DEFAULT;
    return Math.max(
      ...allVehicles.map((v) => Number(v.precio_venta_final ?? v.precio_venta))
    );
  }, [allVehicles]);

  // Vehículos filtrados, agrupados por categoría
  const groupedVehicles = useMemo(() => {
    const filtered = allVehicles.filter((v) => {
      const precio = Number(v.precio_venta_final ?? v.precio_venta);
      const autonomia = Number(v.autonomia_km ?? 0);
      const cat = v.categoria || "Sin Categoría";
      return (
        (filterCategoria === "Todas" || cat === filterCategoria) &&
        (filterMarca === "Todas" || v.marca === filterMarca) &&
        (filterColor === "Todos" || v.color === filterColor) &&
        precio <= filterPrecioMax &&
        autonomia >= filterAutonomiaMin
      );
    });

    return filtered.reduce((acc, v) => {
      const cat = v.categoria || "Sin Categoría";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(v);
      return acc;
    }, {} as Record<string, CatalogVehicle[]>);
  }, [allVehicles, filterCategoria, filterMarca, filterPrecioMax, filterAutonomiaMin]);

  const totalFiltrados = Object.values(groupedVehicles).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const resetFiltros = () => {
    setFilterCategoria("Todas");
    setFilterMarca("Todas");
    setFilterColor("Todos");
    setFilterPrecioMax(precioMaxReal);
    setFilterAutonomiaMin(0);
    setPage(1);
  };

  // Aplanar todos los vehículos filtrados para paginación
  const allFiltered = useMemo(
    () => Object.values(groupedVehicles).flat(),
    [groupedVehicles]
  );

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(allFiltered.length / PAGE_SIZE);
  const paginatedFiltered = useMemo(
    () => allFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allFiltered, page]
  );

  // JSON-LD: ItemList con los vehículos visibles en la página actual
  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": filterMarca !== "Todas"
      ? `Vehículos eléctricos ${filterMarca} en Costa Rica`
      : "Catálogo de vehículos eléctricos en Costa Rica",
    "numberOfItems": totalFiltrados,
    "itemListElement": paginatedFiltered.map((v, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": `${v.marca} ${v.modelo} ${v.año}`,
      "url": `https://conejo-motors.web.app/catalog/${v.id}`,
    })),
  }), [paginatedFiltered, totalFiltrados, filterMarca]);

  // Título y descripción dinámicos según filtro de marca
  const seoTitle = filterMarca !== "Todas"
    ? `Vehículos Eléctricos ${filterMarca} en Costa Rica`
    : "Catálogo de Vehículos Eléctricos";
  const seoDesc = filterMarca !== "Todas"
    ? `Todos los modelos eléctricos ${filterMarca} disponibles en Conejo Motors Costa Rica. Precios, autonomía y especificaciones.`
    : `Catálogo completo de vehículos eléctricos en Conejo Motors Costa Rica. ${totalFiltrados} modelos disponibles: BYD, MG, GWM y más marcas.`;

  if (loading) return <p>Cargando vehículos...</p>;

  return (
    <div className={stylesLayout.pageContainer}>

      <SeoHead
        title={seoTitle}
        description={seoDesc}
        canonical="/catalog"
        jsonLd={jsonLd}
      />

      {/* H1 semántico — cambia cuando se filtra por marca */}
      <h1 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        {filterMarca !== "Todas"
          ? `Vehículos Eléctricos ${filterMarca}`
          : "Catálogo de Vehículos Eléctricos"}
      </h1>
      <p style={{ textAlign: "center", color: "#64748b", marginBottom: "2rem" }}>
        {totalFiltrados} vehículo{totalFiltrados !== 1 ? "s" : ""} disponible{totalFiltrados !== 1 ? "s" : ""}
        {filterMarca !== "Todas" && ` · Marca: ${filterMarca}`}
        {filterCategoria !== "Todas" && ` · Categoría: ${filterCategoria}`}
      </p>

      {/* ── PANEL DE FILTROS ── */}
      <div className={filterStyles.filterPanel}>
        {/* Categoría */}
        <div className={filterStyles.filterGroup}>
          <label className={filterStyles.filterLabel}>Categoría</label>
          <div className={filterStyles.pillGroup}>
            {categorias.map((cat) => (
              <button
                key={cat}
                className={`${filterStyles.pill} ${filterCategoria === cat ? filterStyles.pillActive : ""}`}
                onClick={() => setFilterCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={filterStyles.filterRow}>
          {/* Marca */}
          <div className={filterStyles.filterGroup}>
            <label className={filterStyles.filterLabel}>Marca</label>
            <select
              className={filterStyles.filterSelect}
              value={filterMarca}
              onChange={(e) => setFilterMarca(e.target.value)}
            >
              {marcas.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className={filterStyles.filterGroup}>
            <label className={filterStyles.filterLabel}>Color</label>
            <select
              className={filterStyles.filterSelect}
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
            >
              {colores.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Precio máximo */}
          <div className={filterStyles.filterGroup}>
            <label className={filterStyles.filterLabel}>
              Precio máximo: <strong>{formatCRC(filterPrecioMax)}</strong>
            </label>
            <input
              type="range"
              min={0}
              max={precioMaxReal || PRICE_MAX_DEFAULT}
              step={500_000}
              value={filterPrecioMax}
              onChange={(e) => setFilterPrecioMax(Number(e.target.value))}
              className={filterStyles.filterRange}
            />
            <div className={filterStyles.rangeLabels}>
              <span>₡0</span>
              <span>{formatCRC(precioMaxReal || PRICE_MAX_DEFAULT)}</span>
            </div>
          </div>

          {/* Autonomía mínima */}
          <div className={filterStyles.filterGroup}>
            <label className={filterStyles.filterLabel}>
              Autonomía mínima: <strong>{filterAutonomiaMin} km</strong>
            </label>
            <input
              type="range"
              min={0}
              max={600}
              step={25}
              value={filterAutonomiaMin}
              onChange={(e) => setFilterAutonomiaMin(Number(e.target.value))}
              className={filterStyles.filterRange}
            />
            <div className={filterStyles.rangeLabels}>
              <span>0 km</span>
              <span>600 km</span>
            </div>
          </div>
        </div>

        {/* Reset */}
        <button className={filterStyles.resetBtn} onClick={resetFiltros}>
          ✕ Limpiar filtros
        </button>
      </div>

      {/* ── RESULTADOS ── */}
      {totalFiltrados === 0 ? (
        <div className={filterStyles.noResults}>
          <p>😔 No hay vehículos que coincidan con los filtros seleccionados.</p>
          <button className={filterStyles.resetBtn} onClick={resetFiltros}>
            Ver todos los modelos
          </button>
        </div>
      ) : (
        <>
          <div className={styles.catalogGrid}>
            {paginatedFiltered.map((vehicle) => (
              <div key={vehicle.id} className={styles.vehicleCard}>
                <div className={styles.imgWrap}>
                  <img
                    src={
                      vehicle.imagenes?.[0]
                        ? getImageUrl(vehicle.imagenes[0].url)
                        : vehicle.profile?.imagenes?.[0]
                        ? getImageUrl(vehicle.profile.imagenes[0].url)
                        : "/placeholder.png"
                    }
                    alt={`${vehicle.marca} ${vehicle.modelo}`}
                    className={styles.vehicleImage}
                  />
                  {Number(vehicle.descuento_porcentaje) > 0 && (
                    <span className={styles.discountBadge}>−{vehicle.descuento_porcentaje}%</span>
                  )}
                  {vehicle.categoria && (
                    <span className={styles.catBadge}>{vehicle.categoria}</span>
                  )}
                  <VehicleRibbon visibilidad={(vehicle as any).visibilidad} clasificacion={(vehicle as any).clasificacion_inventario} />
                </div>
                <div className={styles.vehicleInfo}>
                  <h3>{vehicle.marca} {vehicle.modelo} ({vehicle.año})</h3>
                  <p className={styles.price}>
                    {formatCRC(Number(vehicle.precio_venta_final ?? vehicle.precio_venta))}
                    {vehicle.precio_venta_usd && (
                      <span style={{ fontSize: "0.8em", color: "#64748b", marginLeft: "0.5rem" }}>
                        / ${Number(vehicle.precio_venta_usd).toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
                      </span>
                    )}
                  </p>
                  {Number(vehicle.descuento_porcentaje) > 0 && (
                    <p className={styles.oldPrice}>{formatCRC(Number(vehicle.precio_venta))}</p>
                  )}
                  {vehicle.autonomia_km && (
                    <div className={styles.specs}>
                      <span>🛣️ {vehicle.autonomia_km} km</span>
                    </div>
                  )}
                  <Link
                    to={`/catalog/${vehicle.id}`}
                    className="btn btn-principal"
                    style={{ marginTop: "auto" }}
                  >
                    Ver Ficha Técnica
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            totalItems={allFiltered.length}
          />
        </>
      )}
    </div>
  );
};
