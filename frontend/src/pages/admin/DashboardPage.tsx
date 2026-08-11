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
import { LuChartColumnStacked, LuWallet, LuEye, LuSettings, LuPencil, LuClock, LuTrash2, LuX, LuCopy } from "react-icons/lu";

const CRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

// Mapa de nombres de color → hex para el punto visual
const COLOR_HEX: Record<string, string> = {
  negro: "#111827", blanco: "var(--slate-50)", gris: "#9ca3af", plateado: "var(--slate-300)", plata: "var(--slate-300)",
  celeste: "#7dd3fc", azul: "#2563eb", "azul marino": "#1e3a8a", rojo: "var(--danger)", verde: "#16a34a",
  amarillo: "#eab308", naranja: "#f97316", cafe: "#92400e", "café": "#92400e", morado: "#7c3aed",
  dorado: "#d4af37", beige: "#e7dcc8", vino: "#7f1d1d",
};
const colorHex = (c?: string) => COLOR_HEX[(c ?? "").trim().toLowerCase()] ?? "var(--slate-300)";

const ESTADO_STYLE: Record<string, { bg: string; fg: string }> = {
  Disponible: { bg: "#dcfce7", fg: "#15803d" },
  Reservado: { bg: "#fef3c7", fg: "#92400e" },
  Vendido: { bg: "var(--slate-200)", fg: "var(--slate-600)" },
  Demo: { bg: "#ede9fe", fg: "#7c3aed" },
};

const marginColor = (m: number) => (m < 0 ? "var(--danger)" : m < 5 ? "#d97706" : "#16a34a");

export const DashboardPage = () => {
  const confirm = useConfirm();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [historialVehicle, setHistorialVehicle] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Record<number, { precio_venta: string; precio_venta_usd: string; descuento: string }>>({});
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

  useEffect(() => { fetchVehicles(); }, []);

  const handleOpenCreateModal = () => { setEditingVehicle(null); setIsModalOpen(true); };
  const handleOpenEditModal = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingVehicle(null); };
  const handleSuccess = () => { fetchVehicles(); handleCloseModal(); };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Eliminar vehículo",
      message: `¿Eliminar el vehículo #${id}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar", danger: true,
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/vehicles/${id}`);
      toast.success("Vehículo eliminado con éxito.");
      fetchVehicles();
    } catch (err) {
      const msg = "Error al eliminar el vehículo.";
      setError(msg); toast.error(msg); console.error(err);
    }
  };

  const copyVin = (vin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(vin).then(() => toast.success(`VIN copiado: ${vin}`)).catch(() => {});
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else { n.add(id); startEdit(id); }
      return n;
    });
  };

  // ── Edición de precios (inline) ─────────────────────────────────────────
  const startEdit = (id: number) => {
    const v = vehicles.find(x => x.id === id);
    if (!v) return;
    setEditing(prev => ({
      ...prev,
      [id]: {
        precio_venta: String(v.precio_venta ?? v.precio_costo),
        precio_venta_usd: v.precio_venta_usd != null ? String(v.precio_venta_usd) : "",
        descuento: String(v.descuento_porcentaje ?? 0),
      },
    }));
  };

  const setEdit = (id: number, campo: string, valor: string) =>
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));

  const getPreview = (v: Vehicle) => {
    const e = editing[v.id];
    if (!e) return null;
    const pv = parseFloat((e.precio_venta || "").replace(/,/g, "")) || 0;
    const d = parseFloat(e.descuento) || 0;
    const final = pv * (1 - d / 100);
    const costo = Number(v.precio_costo);
    const margen = costo > 0 ? ((final - costo) / costo) * 100 : 0;
    return { final, margen };
  };

  const handleSavePrecio = async (v: Vehicle) => {
    const e = editing[v.id];
    const precio_venta = parseFloat((e.precio_venta || "").replace(/,/g, ""));
    const precio_venta_usd = e.precio_venta_usd.trim() ? parseFloat(e.precio_venta_usd.replace(/,/g, "")) : null;
    const descuento = parseFloat(e.descuento);
    if (isNaN(precio_venta) || precio_venta <= 0) return toast.error("Precio de venta inválido.");
    if (precio_venta_usd !== null && (isNaN(precio_venta_usd) || precio_venta_usd <= 0)) return toast.error("Precio USD inválido.");
    if (isNaN(descuento) || descuento < 0 || descuento > 100) return toast.error("Descuento debe ser 0–100.");

    const precioFinal = precio_venta * (1 - descuento / 100);
    const bajoCosto = precioFinal < Number(v.precio_costo);
    if (bajoCosto) {
      const ok = await confirm({
        title: "Precio bajo costo",
        message: `El precio final (${CRC(precioFinal)}) es INFERIOR al costo de inventario (${CRC(v.precio_costo)}). ¿Guardar igual?`,
        confirmText: "Guardar igual", danger: true,
      });
      if (!ok) return;
    }
    try {
      await apiClient.patch(`/vehicles/${v.id}/pricing`, { precio_venta, precio_venta_usd, descuento_porcentaje: descuento });
      toast.success(`✅ Precio actualizado${bajoCosto ? " — ⚠️ bajo costo" : ""}`);
      fetchVehicles();
    } catch { toast.error("Error al guardar el precio."); }
  };

  // ── Métricas / filtros ──────────────────────────────────────────────────
  const esEspecial = (v: Vehicle) => {
    const c = v.clasificacion_inventario;
    if (c) return c !== "En Stock";
    return v.visibilidad === "Agotado" || v.visibilidad === "Contrapedido";
  };
  const stockActivo = useMemo(() => vehicles.filter(v => v.estado === "Disponible" && !esEspecial(v)).length, [vehicles]);
  const especiales = useMemo(() => vehicles.filter(esEspecial), [vehicles]);

  const filtered = useMemo(() => {
    let list = vehicles;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => `${v.marca} ${v.modelo} ${v.año} ${v.vin} ${v.color}`.toLowerCase().includes(q));
    }
    if (filterEstado) list = list.filter(v => v.estado === filterEstado);
    return list;
  }, [vehicles, search, filterEstado]);

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
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const inp: React.CSSProperties = { padding: "0.4rem 0.55rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.85rem", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <>
      <div className={styles.header}>
        <h1>Inventario de Vehículos</h1>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button className="btn" onClick={exportar} style={{ border: "1px solid var(--slate-300)", background: "#fff", color: "var(--slate-700)", display: "flex", alignItems: "center", gap: "0.4rem" }} title="Exportar a Excel">
            <LuChartColumnStacked size={16} /> Exportar Excel
          </button>
          <button className="btn btn-principal" onClick={handleOpenCreateModal}>Añadir Vehículo</button>
        </div>
      </div>

      <Card title={
        <span>
          Inventario ({stockActivo} en stock activo
          {especiales.length > 0 && (
            <span style={{ fontSize: "0.78rem", color: "var(--slate-400)", fontWeight: 400, marginLeft: "0.5rem" }}>
              · {especiales.length} fuera de inventario
              {especiales.map(v => ` (${v.modelo} — ${v.clasificacion_inventario ?? v.visibilidad})`).join(",")}
            </span>
          )}
          )
        </span>
      }>
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="🔍 Buscar por marca, modelo, VIN, color…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
          <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }} className={styles.filterSelect}>
            <option value="">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Reservado">Reservado</option>
            <option value="Vendido">Vendido</option>
            <option value="Demo">Demo / uso interno</option>
          </select>
          {(search || filterEstado) && (
            <button className={styles.clearBtn} onClick={() => { setSearch(""); setFilterEstado(""); setPage(1); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuX size={14} /> Limpiar</button>
          )}
        </div>

        {/* Lista de unidades (filas expandibles) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {paginated.length === 0 && <p style={{ textAlign: "center", color: "var(--slate-400)", padding: "1.5rem" }}>Sin vehículos.</p>}
          {paginated.map((v) => {
            const abierto = expanded.has(v.id);
            const est = ESTADO_STYLE[v.estado] ?? ESTADO_STYLE.Vendido;
            const precioFinal = Number(v.precio_venta_final ?? v.precio_venta ?? 0);
            const prev = getPreview(v);
            const img = v.profile?.imagenes && v.profile.imagenes.length > 0
              ? getImageUrl([...v.profile.imagenes].sort((a, b) => a.order - b.order)[0].url) : null;
            return (
              <div key={v.id} style={{ border: "1px solid var(--slate-200)", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
                {/* Fila compacta */}
                <div
                  onClick={() => toggleExpand(v.id)}
                  style={{ display: "grid", gridTemplateColumns: "48px 1.6fr 1.3fr 110px 130px 28px", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.9rem", cursor: "pointer" }}
                >
                  <div style={{ position: "relative", width: 48, height: 36, borderRadius: 6, overflow: "hidden", background: "var(--slate-100)" }}>
                    {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "0.6rem", color: "var(--slate-400)", display: "grid", placeItems: "center", height: "100%" }}>s/f</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span title={v.color} style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex(v.color), border: "1.5px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                      <strong style={{ color: "var(--brand-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.marca} {v.modelo}</strong>
                      <span style={{ color: "var(--slate-500)", fontSize: "0.82rem" }}>{v.año}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--slate-400)", textTransform: "capitalize" }}>{v.color || "—"} · {v.bodega?.nombre || "sin ubicación"}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <button
                      onClick={(e) => copyVin(v.vin, e)}
                      title="Copiar VIN"
                      style={{ background: "var(--slate-50)", border: "1px solid var(--slate-200)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.78rem", color: "var(--slate-700)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <LuCopy size={12} /> {v.vin}
                    </button>
                  </div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: est.bg, color: est.fg, borderRadius: 20, padding: "2px 10px", textAlign: "center" }}>{v.estado}</span>
                  <strong style={{ color: "var(--brand-dark)", textAlign: "right", fontSize: "0.9rem" }}>{CRC(precioFinal)}</strong>
                  <span style={{ color: "var(--slate-400)", textAlign: "center", transform: abierto ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                </div>

                {/* Panel expandido */}
                {abierto && (
                  <div style={{ borderTop: "1px solid var(--slate-100)", padding: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", background: "#fbfcfe" }}>
                    {/* Precios */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.35rem" }}><LuWallet size={14} /> Precio</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", marginBottom: "0.5rem" }}>Costo inventario: <strong style={{ color: "var(--slate-700)" }}>{CRC(Number(v.precio_costo))}</strong></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--slate-600)", fontWeight: 600 }}>Precio de lista (₡)
                          <input value={editing[v.id]?.precio_venta ?? ""} onChange={(e) => setEdit(v.id, "precio_venta", e.target.value)} style={inp} />
                        </label>
                        <label style={{ fontSize: "0.75rem", color: "var(--slate-600)", fontWeight: 600 }}>Precio USD
                          <input value={editing[v.id]?.precio_venta_usd ?? ""} onChange={(e) => setEdit(v.id, "precio_venta_usd", e.target.value)} placeholder="opcional" style={inp} />
                        </label>
                        <label style={{ fontSize: "0.75rem", color: "var(--slate-600)", fontWeight: 600 }}>Descuento %
                          <input value={editing[v.id]?.descuento ?? ""} onChange={(e) => setEdit(v.id, "descuento", e.target.value)} style={inp} />
                        </label>
                        <div style={{ alignSelf: "end", fontSize: "0.8rem" }}>
                          {prev && <>Final: <strong>{CRC(prev.final)}</strong><br /><span style={{ color: marginColor(prev.margen) }}>Margen {prev.margen.toFixed(1)}%</span></>}
                        </div>
                      </div>
                      <button onClick={() => handleSavePrecio(v)} className="btn btn-principal" style={{ marginTop: "0.6rem", fontSize: "0.82rem" }}>Guardar precio</button>
                    </div>

                    {/* Visibilidad + Uso */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.35rem" }}><LuEye size={14} /> Visibilidad y uso</div>
                      <VisibilityButtons
                        vehicleId={v.id}
                        current={v.visibilidad ?? "Visible"}
                        clasificacion={v.clasificacion_inventario ?? "En Stock"}
                        estado={(v.estado as any) ?? "Disponible"}
                        onEstadoChanged={(val) => setVehicles(prev => prev.map(x => x.id === v.id ? { ...x, estado: val } : x))}
                        onChanged={(val) => setVehicles(prev => prev.map(x => x.id === v.id ? { ...x, visibilidad: val } : x))}
                        onClasificacionChanged={(val) => setVehicles(prev => prev.map(x => x.id === v.id ? { ...x, clasificacion_inventario: val } : x))}
                      />
                    </div>

                    {/* Acciones */}
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.35rem" }}><LuSettings size={14} /> Acciones</div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button onClick={() => handleOpenEditModal(v)} className="btn" style={{ border: "1px solid var(--slate-300)", background: "#fff", color: "var(--slate-700)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}><LuPencil size={14} /> Editar ficha</button>
                        <button onClick={() => setHistorialVehicle(v)} className="btn" style={{ border: "1px solid var(--slate-300)", background: "#fff", color: "var(--slate-700)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}><LuClock size={14} /> Historial</button>
                        <button onClick={() => handleDelete(v.id)} className="btn" style={{ border: "1px solid #fecaca", background: "#fff", color: "var(--danger)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}><LuTrash2 size={14} /> Eliminar</button>
                      </div>
                      <div style={{ marginTop: "0.6rem", position: "relative", width: 90, height: 60, borderRadius: 6, overflow: "hidden", background: "var(--slate-100)" }}>
                        {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        <VehicleRibbon visibilidad={v.visibilidad} clasificacion={v.clasificacion_inventario} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Pagination page={page} totalPages={totalPages} onPage={setPage} totalItems={filtered.length} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingVehicle ? "Editar Vehículo" : "Añadir Nuevo Vehículo"}>
        <VehicleForm onSuccess={handleSuccess} initialData={editingVehicle} />
      </Modal>

      {historialVehicle && (
        <VehicleHistorialModal
          vehicleId={historialVehicle.id}
          vehicleLabel={`${historialVehicle.marca} ${historialVehicle.modelo} (VIN ${historialVehicle.vin})`}
          onClose={() => setHistorialVehicle(null)}
        />
      )}
    </>
  );
};
