import toast from "react-hot-toast";
import { useEffect, useState, useMemo } from "react";
import apiClient from "@/api/apiClient";
import styles from "./GastosPage.module.css";
import { LuPlus, LuReceipt } from "react-icons/lu";
import { exportToExcel } from "@/utils/exportExcel";

interface Gasto { id: number; categoria: string; descripcion: string; monto: number; fecha: string; numero_factura?: string; proveedor?: { nombre: string }; comprobante_gcs_path?: string | null; metodo_pago?: string; notas?: string; iva_monto?: number; nombre_comercio?: string; }

// Categorías adaptadas al negocio (concesionaria EV + taller)
const CATS = [
  'Insumos de Taller', 'Herramientas y Equipo', 'Repuestos', 'Combustible',
  'Mantenimiento Instalaciones', 'Limpieza', 'Publicidad y Marketing', 'Salarios y Planilla',
  'Servicios Publicos', 'Alquiler', 'Papeleria y Oficina', 'Software y Tecnologia',
  'Alimentacion', 'Transporte y Logistica', 'Seguros', 'Impuestos y Legales',
  'Comisiones y Bancarios', 'Capacitacion', 'Otro',
];

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ categoria: 'Insumos de Taller', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], numero_factura: '', nombre_comercio: '', metodo_pago: 'Efectivo', tiene_iva: false, notas: '' });
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [verTodos, setVerTodos] = useState(false);

  // Gastos del período seleccionado (o todos)
  const gastosFiltrados = useMemo(() => {
    if (verTodos) return gastos;
    return gastos.filter((g) => (g.fecha || "").slice(0, 7) === periodo);
  }, [gastos, periodo, verTodos]);

  const totalPeriodo = useMemo(() => gastosFiltrados.reduce((a, g) => a + +g.monto, 0), [gastosFiltrados]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gastosFiltrados) m.set(g.categoria, (m.get(g.categoria) || 0) + +g.monto);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [gastosFiltrados]);

  const formVacio = { categoria: 'Insumos de Taller', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], numero_factura: '', nombre_comercio: '', metodo_pago: 'Efectivo', tiene_iva: false, notas: '' };

  const abrirNuevo = () => { setEditId(null); setForm(formVacio); setComprobante(null); setShowModal(true); };
  const abrirEditar = (g: Gasto) => {
    setEditId(g.id);
    setForm({
      categoria: g.categoria, descripcion: g.descripcion, monto: String(g.monto), fecha: g.fecha,
      numero_factura: g.numero_factura || '', nombre_comercio: g.nombre_comercio || '', metodo_pago: g.metodo_pago || 'Efectivo',
      tiene_iva: Number(g.iva_monto) > 0, notas: g.notas || '',
    });
    setComprobante(null);
    setShowModal(true);
  };

  const eliminar = async (g: Gasto) => {
    if (!window.confirm(`¿Eliminar el gasto "${g.descripcion}" (${g.fecha})? Se revertirá su asiento contable.`)) return;
    try {
      await apiClient.delete(`/gastos/${g.id}`);
      toast.success("Gasto eliminado (asiento revertido).");
      cargar();
    } catch { toast.error("Error al eliminar."); }
  };

  const verComprobante = async (id: number) => {
    try {
      const res = await apiClient.get(`/gastos/${id}/comprobante`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
    } catch { toast.error("No se pudo abrir el comprobante."); }
  };

  const cargar = async () => {
    setLoading(true);
    const r = await apiClient.get("/gastos");
    setGastos(r.data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.descripcion || !form.monto) return toast.error("Complete los campos");
    if (guardando) return;
    const monto = +form.monto;
    // Si el monto incluye IVA (13%), se desglosa para el crédito fiscal (cuenta 1210 / D-150).
    const payload: any = { ...form, monto };
    if ((form as any).tiene_iva) {
      const base = +(monto / 1.13).toFixed(2);
      payload.base_imponible = base;
      payload.iva_monto = +(monto - base).toFixed(2);
      payload.iva_tarifa = "T13";
    } else {
      payload.iva_monto = 0; payload.base_imponible = monto;
    }
    delete payload.tiene_iva;
    setGuardando(true);
    try {
      let id: number | undefined;
      if (editId) {
        await apiClient.patch(`/gastos/${editId}`, payload);
        id = editId;
      } else {
        const res = await apiClient.post("/gastos", payload);
        id = res.data?.id;
      }
      if (comprobante && id) {
        setSubiendoFoto(true);
        try {
          const fd = new FormData();
          fd.append("file", comprobante);
          await apiClient.post(`/gastos/${id}/comprobante`, fd);
        } catch { toast.error("El gasto se guardó, pero falló la subida del comprobante."); }
        finally { setSubiendoFoto(false); }
      }
      toast.success(editId ? "Gasto actualizado." : "Gasto registrado.");
      setComprobante(null); setEditId(null);
      setShowModal(false); cargar();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error al guardar el gasto.");
    } finally {
      setGuardando(false);
    }
  };

  const f = (k: any) => (e: any) => setForm({...form, [k]: e.target.value});

  const exportar = () => exportToExcel(
    gastosFiltrados.map(g => ({
      Fecha: g.fecha, Categoría: g.categoria, Descripción: g.descripcion,
      "N° Factura": g.numero_factura || "", Proveedor: g.proveedor?.nombre || "", Comercio: g.nombre_comercio || "", Monto: g.monto,
    })),
    "Gastos", verTodos ? "Gastos-todos" : `Gastos-${periodo}`,
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Gastos Operativos</h1><p>Control de gastos y costos de operación</p></div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={styles.btnPrimary} style={{ background: "#fff", color: "#334155", border: "1px solid #cbd5e1" }} onClick={exportar}>📊 Excel</button>
          <button className={styles.btnPrimary} onClick={abrirNuevo}><LuPlus size={16} /> Nuevo Gasto</button>
        </div>
      </div>

      {/* Resumen del período seleccionado */}
      <div className={styles.kpiCard} style={{ display: "block" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LuReceipt size={24} className={styles.kpiIcon} />
            <div>
              <div className={styles.kpiVal}>₡{totalPeriodo.toLocaleString('es-CR')}</div>
              <div className={styles.kpiLabel}>{verTodos ? "Total de todos los gastos" : `Gastos de ${periodo}`} · {gastosFiltrados.length} mov.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="month" value={periodo} disabled={verTodos} onChange={(e) => setPeriodo(e.target.value)} style={{ padding: "0.4rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem" }} />
            <button onClick={() => setVerTodos((v) => !v)} style={{ fontSize: "0.82rem", borderRadius: 8, padding: "0.45rem 0.8rem", cursor: "pointer", fontWeight: 600, border: `1.5px solid ${verTodos ? "#024f7d" : "#e2e8f0"}`, background: verTodos ? "#024f7d" : "#fff", color: verTodos ? "#fff" : "#475569" }}>
              {verTodos ? "Ver por mes" : "Ver todos"}
            </button>
          </div>
        </div>
        {/* Desglose por categoría */}
        {porCategoria.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.9rem", paddingTop: "0.9rem", borderTop: "1px solid #f1f5f9" }}>
            {porCategoria.map(([cat, monto]) => (
              <span key={cat} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.4rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: "3px 12px", fontSize: "0.8rem" }}>
                <span style={{ color: "#475569" }}>{cat}</span>
                <strong style={{ color: "#0a2540" }}>₡{monto.toLocaleString('es-CR')}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className={styles.tabla}>
          <div className={styles.th}><span>Fecha</span><span>Categoría</span><span>Descripción</span><span>N° Factura</span><span>Proveedor / Comercio</span><span>Monto</span></div>
          {gastosFiltrados.length === 0 && <p className={styles.empty}>Sin gastos en este período.</p>}
          {gastosFiltrados.map(g => (
            <div key={g.id} className={styles.tr}>
              <span>{g.fecha}</span>
              <span className={styles.cat}>{g.categoria}</span>
              <span>{g.descripcion}</span>
              <span>
                {g.numero_factura || '-'}
                {g.comprobante_gcs_path && (
                  <button onClick={() => verComprobante(g.id)} title="Ver factura adjunta" style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}>📎</button>
                )}
              </span>
              <span>{g.proveedor?.nombre || g.nombre_comercio || '-'}</span>
              <span className={styles.monto} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                ₡{(+g.monto).toLocaleString('es-CR')}
                <button onClick={() => abrirEditar(g)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>✏️</button>
                <button onClick={() => eliminar(g)} title="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>🗑️</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editId ? "Editar Gasto" : "Nuevo Gasto"}</h2>
            <div className={styles.grid}>
              <div className={styles.fg}><label>Categoría</label><select value={form.categoria} onChange={f('categoria')}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className={styles.fg}><label>Monto *</label><input type="number" value={form.monto} onChange={f('monto')} /></div>
              <div className={`${styles.fg} ${styles.full}`}><label>Descripción *</label><input value={form.descripcion} onChange={f('descripcion')} /></div>
              <div className={styles.fg}><label>📅 Fecha del gasto (cambiala para cargar meses atrás)</label><input type="date" value={form.fecha} onChange={f('fecha')} /></div>
              <div className={styles.fg}><label>N° Factura</label><input value={form.numero_factura} onChange={f('numero_factura')} /></div>
              <div className={styles.fg}><label>🏪 Comercio / tienda</label><input value={form.nombre_comercio} onChange={f('nombre_comercio')} placeholder="Ej: EPA, Ferretería…" /></div>
              <div className={styles.fg}><label>Método de pago</label><select value={form.metodo_pago} onChange={f('metodo_pago')}><option>Efectivo</option><option>Banco</option><option>Transferencia</option><option>SINPE</option><option>Tarjeta</option><option>Cheque</option><option>Credito</option><option value="Aporte del socio">Aporte del socio (pagado por el dueño)</option></select></div>
              <div className={styles.fg}><label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}><input type="checkbox" checked={(form as any).tiene_iva} onChange={(e) => setForm({ ...form, tiene_iva: e.target.checked } as any)} /> El monto incluye IVA 13% (crédito fiscal)</label></div>
              <div className={`${styles.fg} ${styles.full}`}>
                <label>📎 Factura / comprobante (foto o PDF)</label>
                <input type="file" accept="image/*,application/pdf" capture="environment" disabled={guardando} onChange={(e) => setComprobante(e.target.files?.[0] ?? null)} />
                {subiendoFoto ? (
                  <span className={styles.subiendo}><span className={styles.spinner} /> Subiendo comprobante…</span>
                ) : comprobante ? (
                  <span style={{ fontSize: "0.78rem", color: "#15803d" }}>✓ {comprobante.name} (se sube al guardar)</span>
                ) : null}
              </div>
              <div className={`${styles.fg} ${styles.full}`}><label>Notas</label><textarea value={form.notas} onChange={f('notas')} rows={2} /></div>
            </div>
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={guardar} disabled={guardando}>
                {guardando ? (<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className={`${styles.spinner} ${styles.spinnerWhite}`} /> {subiendoFoto ? "Subiendo foto…" : "Guardando…"}</span>) : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
