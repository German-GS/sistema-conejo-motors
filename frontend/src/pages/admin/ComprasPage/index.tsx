import { useState, useEffect, useMemo } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);

interface Linea { descripcion: string; cantidad: number; precio_unitario: number; iva_porcentaje: number; }
interface Orden {
  id: number; numero: string; fecha: string; estado: string;
  subtotal: number; iva: number; total: number;
  proveedor?: { id: number; nombre: string };
  lineas?: any[]; comprobante_gcs_path?: string | null;
}

const ESTADO_STYLE: Record<string, [string, string]> = {
  Borrador: ["#f1f5f9", "#475569"], Enviada: ["#dbeafe", "#1d4ed8"],
  "Recibida Parcial": ["#fef3c7", "#92400e"], Recibida: ["#dcfce7", "#15803d"], Cancelada: ["#fee2e2", "#b91c1c"],
};

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" };
const inp: React.CSSProperties = { padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const th: React.CSSProperties = { padding: "6px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", textAlign: "left" };
const td: React.CSSProperties = { padding: "6px 10px", color: "#334155", fontSize: "0.85rem" };

export const ComprasPage = () => {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [recibida, setRecibida] = useState(true);
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 13 }]);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([apiClient.get("/compras"), apiClient.get("/proveedores")]);
      setOrdenes(o.data ?? []);
      setProveedores(p.data ?? []);
    } catch { toast.error("No se pudieron cargar las órdenes."); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const totales = useMemo(() => {
    let subtotal = 0, iva = 0;
    for (const l of lineas) {
      const base = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
      subtotal += base; iva += base * (Number(l.iva_porcentaje) || 0) / 100;
    }
    return { subtotal: +subtotal.toFixed(2), iva: +iva.toFixed(2), total: +(subtotal + iva).toFixed(2) };
  }, [lineas]);

  const setLinea = (i: number, campo: keyof Linea, valor: any) =>
    setLineas((prev) => prev.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));

  const guardar = async () => {
    const validas = lineas.filter((l) => l.descripcion.trim() && Number(l.cantidad) > 0 && Number(l.precio_unitario) >= 0);
    if (validas.length === 0) return toast.error("Agregá al menos una línea válida.");
    setGuardando(true);
    try {
      await apiClient.post("/compras", {
        proveedor: proveedorId ? { id: Number(proveedorId) } : undefined,
        fecha, estado: recibida ? "Recibida" : "Borrador", notas,
        subtotal: totales.subtotal, iva: totales.iva, total: totales.total,
        lineas: validas.map((l) => ({
          descripcion: l.descripcion, cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario),
          iva_porcentaje: Number(l.iva_porcentaje), total: +((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0)).toFixed(2),
        })),
      });
      toast.success(recibida ? "Orden recibida y contabilizada (IVA a la 1210)." : "Orden guardada.");
      setShowForm(false); setLineas([{ descripcion: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 13 }]);
      setProveedorId(""); setNotas("");
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al guardar."); }
    finally { setGuardando(false); }
  };

  const marcarRecibida = async (id: number) => {
    if (!window.confirm("Marcar como Recibida contabiliza la compra (Debe 1400 + 1210 / Haber 2100). ¿Continuar?")) return;
    try {
      await apiClient.patch(`/compras/${id}`, { estado: "Recibida" });
      toast.success("Orden recibida y contabilizada.");
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error."); }
  };

  const subirComprobante = async (id: number, file: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file);
      await apiClient.post(`/compras/${id}/comprobante`, fd);
      toast.success("Factura adjuntada."); cargar();
    } catch { toast.error("No se pudo subir la factura."); }
  };
  const verComprobante = async (id: number) => {
    try {
      const res = await apiClient.get(`/compras/${id}/comprobante`, { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch { toast.error("No se pudo abrir la factura."); }
  };

  if (loading) return <p style={{ padding: "2rem" }}>Cargando órdenes de compra…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ margin: 0, color: "#0a2540" }}>🧾 Órdenes de Compra</h1>
        <button onClick={() => setShowForm((s) => !s)} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.6rem 1.1rem", cursor: "pointer", fontWeight: 700 }}>
          {showForm ? "Cerrar" : "+ Nueva orden"}
        </button>
      </div>

      {showForm && (
        <div style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Proveedor
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} style={inp}>
                <option value="">— sin proveedor —</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "0.4rem", alignSelf: "end" }}>
              <input type="checkbox" checked={recibida} onChange={(e) => setRecibida(e.target.checked)} /> Recibida (contabilizar ya)
            </label>
          </div>

          {/* Líneas */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead><tr><th style={th}>Descripción</th><th style={{ ...th, width: 80 }}>Cant.</th><th style={{ ...th, width: 120 }}>Precio unit.</th><th style={{ ...th, width: 80 }}>IVA %</th><th style={{ ...th, width: 110, textAlign: "right" }}>Total</th><th style={{ width: 30 }}></th></tr></thead>
              <tbody>
                {lineas.map((l, i) => {
                  const base = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
                  const totalL = base * (1 + (Number(l.iva_porcentaje) || 0) / 100);
                  return (
                    <tr key={i}>
                      <td style={{ padding: 4 }}><input value={l.descripcion} onChange={(e) => setLinea(i, "descripcion", e.target.value)} placeholder="Insumo / repuesto…" style={inp} /></td>
                      <td style={{ padding: 4 }}><input type="number" value={l.cantidad} onChange={(e) => setLinea(i, "cantidad", e.target.value)} style={inp} /></td>
                      <td style={{ padding: 4 }}><input type="number" value={l.precio_unitario} onChange={(e) => setLinea(i, "precio_unitario", e.target.value)} style={inp} /></td>
                      <td style={{ padding: 4 }}>
                        <select value={l.iva_porcentaje} onChange={(e) => setLinea(i, "iva_porcentaje", e.target.value)} style={inp}>
                          {[13, 4, 2, 1, 0.5, 0].map((t) => <option key={t} value={t}>{t}%</option>)}
                        </select>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{CRC(totalL)}</td>
                      <td style={{ padding: 4, textAlign: "center" }}>{lineas.length > 1 && <button onClick={() => setLineas((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>✕</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={() => setLineas((prev) => [...prev, { descripcion: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 13 }])} style={{ background: "none", border: "1px dashed #cbd5e1", color: "#475569", borderRadius: 8, padding: "0.4rem 0.8rem", cursor: "pointer", marginTop: "0.5rem", fontSize: "0.82rem" }}>+ Agregar línea</button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" style={{ ...inp, maxWidth: 320 }} />
            <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
              <div style={{ color: "#64748b" }}>Subtotal: {CRC(totales.subtotal)} · IVA: {CRC(totales.iva)}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0a2540" }}>Total: {CRC(totales.total)}</div>
              <button onClick={guardar} disabled={guardando} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.55rem 1.2rem", cursor: "pointer", fontWeight: 700, marginTop: "0.5rem" }}>{guardando ? "Guardando…" : "Guardar orden"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>N°</th><th style={th}>Fecha</th><th style={th}>Proveedor</th><th style={th}>Estado</th>
                <th style={{ ...th, textAlign: "right" }}>Subtotal</th><th style={{ ...th, textAlign: "right" }}>IVA</th><th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={th}>Factura</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {ordenes.length === 0 && <tr><td style={td} colSpan={9}>Sin órdenes de compra.</td></tr>}
              {ordenes.map((o) => {
                const badge = ESTADO_STYLE[o.estado] ?? ["#f1f5f9", "#475569"];
                return (
                  <tr key={o.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td}>{o.numero}</td>
                    <td style={td}>{o.fecha}</td>
                    <td style={td}>{o.proveedor?.nombre || "—"}</td>
                    <td style={td}><span style={{ fontSize: "0.72rem", fontWeight: 700, background: badge[0], color: badge[1], borderRadius: 20, padding: "2px 10px" }}>{o.estado}</span></td>
                    <td style={{ ...td, textAlign: "right" }}>{CRC(o.subtotal)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{CRC(o.iva)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{CRC(o.total)}</td>
                    <td style={td}>
                      {o.comprobante_gcs_path ? (
                        <button onClick={() => verComprobante(o.id)} title="Ver factura" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>📎</button>
                      ) : (
                        <label title="Adjuntar factura (foto o PDF)" style={{ cursor: "pointer", color: "#64748b" }}>⬆️
                          <input type="file" accept="image/*,application/pdf" capture="environment" style={{ display: "none" }} onChange={(e) => subirComprobante(o.id, e.target.files?.[0] ?? null)} />
                        </label>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {o.estado !== "Recibida" && o.estado !== "Cancelada" && (
                        <button onClick={() => marcarRecibida(o.id)} style={{ border: "1px solid #bbf7d0", background: "#fff", color: "#15803d", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem" }}>Marcar recibida</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.75rem" }}>
          Al marcar una orden como <strong>Recibida</strong>, se contabiliza (Debe 1400 Inventario + Debe 1210 IVA acreditable / Haber 2100 CxP) y el IVA entra a la liquidación D-150.
        </p>
      </div>
    </div>
  );
};
