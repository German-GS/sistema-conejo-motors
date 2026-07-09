import { useState, useEffect, useMemo } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./ProductosPage.module.css";
import { fmtFecha } from "@/utils/dateUtils";

type Categoria = "Repuesto" | "Accesorio" | "Lubricante" | "Electrónico" | "Herramienta" | "Otro";

interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria: Categoria;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  unidad?: string;
  proveedor?: string;
  activo: boolean;
}

interface OrdenProducto {
  id: number;
  cliente_nombre: string;
  total: number;
  estado: string;
  metodo_pago: string;
  fecha_creacion: string;
  vendedor?: { nombre_completo: string };
  lineas: { cantidad: number; precio_unitario: number; subtotal: number; producto: { nombre: string } }[];
}

const CATEGORIAS: Categoria[] = ["Repuesto", "Accesorio", "Lubricante", "Electrónico", "Herramienta", "Otro"];
const CAT_ICONS: Record<Categoria, string> = {
  Repuesto: "🔧", Accesorio: "✨", Lubricante: "🛢️",
  Electrónico: "💡", Herramienta: "🔩", Otro: "📦",
};

const fmtCRC = (v: number) =>
  "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(v);

const EMPTY_FORM = {
  sku: "", nombre: "", descripcion: "", categoria: "Accesorio" as Categoria,
  precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 5,
  unidad: "pieza", proveedor: "", activo: true,
};

export const ProductosPage = () => {
  const [tab, setTab] = useState<"productos" | "ventas" | "nueva_venta">("productos");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenProducto[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Formulario producto
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Búsqueda
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // POS — Nueva venta
  const [posCliente, setPosCliente] = useState({ nombre: "", cedula: "", telefono: "" });
  const [posLineas, setPosLineas] = useState<{ producto: Producto; cantidad: number; descuento: number; iva_tarifa: string }[]>([]);
  const [posDescuento, setPosDescuento] = useState(0);
  const [posMetodo, setPosMetodo] = useState("Efectivo");
  const [posSearch, setPosSearch] = useState("");
  const [submittingVenta, setSubmittingVenta] = useState(false);

  const fetchAll = async () => {
    try {
      const [p, o, s] = await Promise.all([
        apiClient.get("/productos/admin/all"),
        apiClient.get("/productos/ordenes/lista?limit=100"),
        apiClient.get("/productos/stats"),
      ]);
      setProductos(Array.isArray(p.data) ? p.data : []);
      setOrdenes(Array.isArray(o.data) ? o.data : []);
      setStats(s.data);
    } catch { toast.error("Error cargando datos."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    let list = productos;
    if (search) list = list.filter(p => `${p.nombre} ${p.sku}`.toLowerCase().includes(search.toLowerCase()));
    if (filterCat) list = list.filter(p => p.categoria === filterCat);
    return list;
  }, [productos, search, filterCat]);

  // ── CRUD Producto ──────────────────────────────────────────────────────────
  const openNew = () => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (p: Producto) => {
    setEditId(p.id);
    setForm({ ...p, descripcion: p.descripcion ?? "", proveedor: p.proveedor ?? "", unidad: p.unidad ?? "pieza" });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku || !form.nombre || !form.precio_venta) { toast.error("SKU, nombre y precio son requeridos."); return; }
    setSaving(true);
    try {
      if (editId) {
        await apiClient.patch(`/productos/${editId}`, form);
        toast.success("Producto actualizado.");
      } else {
        await apiClient.post("/productos", form);
        toast.success("Producto creado.");
      }
      setShowForm(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al guardar.");
    } finally { setSaving(false); }
  };

  // ── POS ────────────────────────────────────────────────────────────────────
  const posResults = useMemo(() =>
    posSearch ? productos.filter(p => p.activo && `${p.nombre} ${p.sku}`.toLowerCase().includes(posSearch.toLowerCase())).slice(0, 8) : [],
    [posSearch, productos]
  );

  const agregarAlCarrito = (p: Producto) => {
    setPosLineas(prev => {
      const idx = prev.findIndex(l => l.producto.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { producto: p, cantidad: 1, descuento: 0, iva_tarifa: "T13" }];
    });
    setPosSearch("");
  };

  const posSubtotal = posLineas.reduce((s, l) => s + l.producto.precio_venta * l.cantidad - l.descuento, 0);
  const posTotal    = posSubtotal - posDescuento;

  const handleVenta = async () => {
    if (!posCliente.nombre) { toast.error("Ingresa el nombre del cliente."); return; }
    if (!posLineas.length)  { toast.error("Agrega al menos un producto."); return; }
    setSubmittingVenta(true);
    try {
      await apiClient.post("/productos/ordenes", {
        cliente_nombre:   posCliente.nombre,
        cliente_cedula:   posCliente.cedula,
        cliente_telefono: posCliente.telefono,
        metodo_pago:      posMetodo,
        descuento:        posDescuento,
        lineas: posLineas.map(l => ({ productoId: l.producto.id, cantidad: l.cantidad, descuento_linea: l.descuento, iva_tarifa: l.iva_tarifa })),
      });
      toast.success("✅ Venta registrada correctamente.");
      setPosLineas([]); setPosCliente({ nombre: "", cedula: "", telefono: "" });
      setPosDescuento(0); setPosMetodo("Efectivo");
      setTab("ventas"); fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al registrar la venta.");
    } finally { setSubmittingVenta(false); }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner}/><p>Cargando...</p></div>;

  return (
    <div className={styles.page}>
      {/* ── KPIs ── */}
      {stats && (
        <div className={styles.kpiRow}>
          <div className={styles.kpi} style={{ "--c": "#024f7d" } as any}>
            <span className={styles.kpiIcon}>📦</span>
            <div><span className={styles.kpiVal}>{stats.totalProductos}</span><span className={styles.kpiLbl}>Productos activos</span></div>
          </div>
          <div className={styles.kpi} style={{ "--c": stats.stockBajoCount > 0 ? "#dc2626" : "#059669" } as any}>
            <span className={styles.kpiIcon}>{stats.stockBajoCount > 0 ? "⚠️" : "✅"}</span>
            <div><span className={styles.kpiVal}>{stats.stockBajoCount}</span><span className={styles.kpiLbl}>Stock bajo</span></div>
          </div>
          <div className={styles.kpi} style={{ "--c": "#0891b2" } as any}>
            <span className={styles.kpiIcon}>🛒</span>
            <div><span className={styles.kpiVal}>{stats.ventasMesCount}</span><span className={styles.kpiLbl}>Ventas del mes</span></div>
          </div>
          <div className={styles.kpi} style={{ "--c": "#059669" } as any}>
            <span className={styles.kpiIcon}>💰</span>
            <div><span className={styles.kpiVal}>{fmtCRC(stats.ventasMesTotal)}</span><span className={styles.kpiLbl}>Ingresos del mes</span></div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className={styles.tabBar}>
        {[
          { key: "productos", label: "📦 Inventario" },
          { key: "ventas",    label: "🧾 Ventas" },
          { key: "nueva_venta", label: "🛒 Nueva Venta" },
        ].map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: Inventario ════════════════════════════════════════════════ */}
      {tab === "productos" && (
        <>
          <div className={styles.topBar}>
            <input className={styles.searchInput} placeholder="🔍 Buscar por nombre o SKU..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className={styles.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
            </select>
            <button className={styles.newBtn} onClick={openNew}>+ Nuevo Producto</button>
          </div>

          {showForm && (
            <form onSubmit={handleSave} className={styles.formCard}>
              <h3>{editId ? "Editar Producto" : "Nuevo Producto"}</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}><label>SKU *</label>
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required /></div>
                <div className={styles.field}><label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required /></div>
                <div className={styles.field}><label>Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Categoria }))}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select></div>
                <div className={styles.field}><label>Precio Costo ₡</label>
                  <input type="number" min={0} value={form.precio_costo} onChange={e => setForm(f => ({ ...f, precio_costo: Number(e.target.value) }))} /></div>
                <div className={styles.field}><label>Precio Venta ₡ *</label>
                  <input type="number" min={0} value={form.precio_venta} onChange={e => setForm(f => ({ ...f, precio_venta: Number(e.target.value) }))} required /></div>
                <div className={styles.field}><label>Stock Actual</label>
                  <input type="number" min={0} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} /></div>
                <div className={styles.field}><label>Stock Mínimo</label>
                  <input type="number" min={0} value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: Number(e.target.value) }))} /></div>
                <div className={styles.field}><label>Unidad</label>
                  <input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="pieza, litro, kg..." /></div>
                <div className={styles.field}><label>Proveedor</label>
                  <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} /></div>
                <div className={`${styles.field} ${styles.fullWidth}`}><label>Descripción</label>
                  <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-principal" disabled={saving}>{saving ? "Guardando..." : editId ? "Guardar Cambios" : "Crear Producto"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>SKU</th><th>Nombre</th><th>Categoría</th>
                <th>Costo</th><th>Venta</th><th>Margen</th>
                <th>Stock</th><th>Mín.</th><th>Proveedor</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(p => {
                  const margen = p.precio_costo > 0 ? ((p.precio_venta - p.precio_costo) / p.precio_costo * 100).toFixed(1) : "—";
                  const stockBajo = p.stock <= p.stock_minimo;
                  return (
                    <tr key={p.id} className={!p.activo ? styles.inactive : ""}>
                      <td className={styles.sku}>{p.sku}</td>
                      <td><strong>{p.nombre}</strong>{p.descripcion && <div className={styles.sub}>{p.descripcion.slice(0,60)}</div>}</td>
                      <td><span className={styles.catBadge}>{CAT_ICONS[p.categoria]} {p.categoria}</span></td>
                      <td>{fmtCRC(Number(p.precio_costo))}</td>
                      <td><strong>{fmtCRC(Number(p.precio_venta))}</strong></td>
                      <td>{margen !== "—" ? <span className={styles.margen}>{margen}%</span> : "—"}</td>
                      <td>
                        <span className={`${styles.stockBadge} ${stockBajo ? styles.stockLow : styles.stockOk}`}>
                          {stockBajo ? "⚠️ " : ""}{p.stock} {p.unidad ?? ""}
                        </span>
                      </td>
                      <td>{p.stock_minimo}</td>
                      <td className={styles.sub}>{p.proveedor ?? "—"}</td>
                      <td><button className={styles.editBtn} onClick={() => openEdit(p)}>✏️ Editar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className={styles.empty}>No se encontraron productos.</p>}
          </div>
        </>
      )}

      {/* ══ TAB: Ventas ════════════════════════════════════════════════════ */}
      {tab === "ventas" && (
        <div className={styles.ordenesGrid}>
          {ordenes.length === 0 && <p className={styles.empty}>Sin ventas registradas.</p>}
          {ordenes.map(o => (
            <div key={o.id} className={`${styles.ordenCard} ${o.estado === "Anulada" ? styles.anulada : ""}`}>
              <div className={styles.ordenHeader}>
                <span className={styles.ordenId}>#{o.id}</span>
                <strong>{o.cliente_nombre}</strong>
                <span className={`${styles.estadoBadge} ${o.estado === "Completada" ? styles.estadoOk : styles.estadoAnul}`}>{o.estado}</span>
              </div>
              <div className={styles.ordenLineas}>
                {o.lineas.map((l, i) => (
                  <div key={i} className={styles.ordenLinea}>
                    <span>{l.producto.nombre}</span>
                    <span className={styles.sub}>{l.cantidad} × {fmtCRC(Number(l.precio_unitario))} = <strong>{fmtCRC(Number(l.subtotal))}</strong></span>
                  </div>
                ))}
              </div>
              <div className={styles.ordenFooter}>
                <span className={styles.sub}>💳 {o.metodo_pago} · 👤 {o.vendedor?.nombre_completo ?? "—"} · 📅 {fmtFecha(o.fecha_creacion)}</span>
                <strong className={styles.ordenTotal}>{fmtCRC(Number(o.total))}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: Nueva Venta (POS) ══════════════════════════════════════════ */}
      {tab === "nueva_venta" && (
        <div className={styles.posLayout}>
          {/* Buscador de productos */}
          <div className={styles.posLeft}>
            <h3 className={styles.posSection}>🔍 Agregar Productos</h3>
            <div className={styles.posSearchWrap}>
              <input className={styles.posSearch} placeholder="Buscar producto por nombre o SKU..."
                value={posSearch} onChange={e => setPosSearch(e.target.value)} autoFocus />
              {posResults.length > 0 && (
                <div className={styles.posResults}>
                  {posResults.map(p => (
                    <div key={p.id} className={styles.posResult} onClick={() => agregarAlCarrito(p)}>
                      <div>
                        <strong>{p.nombre}</strong>
                        <span className={styles.sub}> {p.sku} · Stock: {p.stock}</span>
                      </div>
                      <strong>{fmtCRC(Number(p.precio_venta))}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Carrito */}
            <div className={styles.carrito}>
              {posLineas.length === 0 && <p className={styles.empty}>El carrito está vacío.</p>}
              {posLineas.map((l, i) => (
                <div key={i} className={styles.carritoLinea}>
                  <div className={styles.carritoNombre}>{l.producto.nombre}</div>
                  <div className={styles.carritoControls}>
                    <button className={styles.qtyBtn} onClick={() => setPosLineas(prev => prev.filter((_, j) => j !== i))}>🗑</button>
                    <input type="number" min={1} max={l.producto.stock} className={styles.qtyInput}
                      value={l.cantidad}
                      onChange={e => setPosLineas(prev => { const n=[...prev]; n[i]={...n[i], cantidad: Number(e.target.value)}; return n; })} />
                    <select
                      title="Tarifa de IVA"
                      value={l.iva_tarifa}
                      onChange={e => setPosLineas(prev => { const n=[...prev]; n[i]={...n[i], iva_tarifa: e.target.value}; return n; })}
                      style={{ fontSize: "0.72rem", borderRadius: 6, border: "1px solid #e2e8f0", padding: "2px 4px" }}
                    >
                      <option value="T13">13%</option><option value="T04">4%</option><option value="T02">2%</option><option value="T01">1%</option><option value="T005">0,5%</option><option value="Exento">Exento</option>
                    </select>
                    <span className={styles.carritoSubtotal}>{fmtCRC(l.producto.precio_venta * l.cantidad)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel de cobro */}
          <div className={styles.posRight}>
            <h3 className={styles.posSection}>🧾 Datos de la Venta</h3>
            <div className={styles.posForm}>
              <label>Cliente *</label>
              <input placeholder="Nombre del cliente" value={posCliente.nombre}
                onChange={e => setPosCliente(p => ({ ...p, nombre: e.target.value }))} />
              <label>Cédula / ID</label>
              <input placeholder="Cédula o pasaporte" value={posCliente.cedula}
                onChange={e => setPosCliente(p => ({ ...p, cedula: e.target.value }))} />
              <label>Teléfono</label>
              <input placeholder="Teléfono" value={posCliente.telefono}
                onChange={e => setPosCliente(p => ({ ...p, telefono: e.target.value }))} />
              <label>Método de Pago</label>
              <select value={posMetodo} onChange={e => setPosMetodo(e.target.value)}>
                {["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia", "SINPE"].map(m => <option key={m}>{m}</option>)}
              </select>
              <label>Descuento General ₡</label>
              <input type="number" min={0} value={posDescuento} onChange={e => setPosDescuento(Number(e.target.value))} />
            </div>

            <div className={styles.posTotales}>
              <div className={styles.posTotalRow}><span>Subtotal:</span><span>{fmtCRC(posSubtotal)}</span></div>
              {posDescuento > 0 && <div className={`${styles.posTotalRow} ${styles.descuento}`}><span>Descuento:</span><span>− {fmtCRC(posDescuento)}</span></div>}
              <div className={`${styles.posTotalRow} ${styles.totalFinal}`}><span>TOTAL:</span><strong>{fmtCRC(posTotal)}</strong></div>
            </div>

            <button className={styles.cobrarBtn} onClick={handleVenta} disabled={submittingVenta || posLineas.length === 0}>
              {submittingVenta ? "Procesando..." : `✅ Cobrar ${fmtCRC(posTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
