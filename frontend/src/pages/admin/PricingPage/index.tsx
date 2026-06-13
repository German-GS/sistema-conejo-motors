import { getImageUrl } from "@/utils/imageUrl";
import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./PricingPage.module.css";
import { VisibilityButtons } from "@/components/VisibilityButtons";
import { VehicleRibbon } from "@/components/VehicleRibbon";

interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  vin: string;
  estado: string;
  visibilidad?: "Visible" | "Oculto" | "Agotado" | "Contrapedido";
  clasificacion_inventario?: "En Stock" | "Agotado" | "Contrapedido" | "No Comercial";
  precio_costo: number;
  precio_venta: number;
  precio_venta_usd: number | null;
  precio_venta_final: number | null;
  descuento_porcentaje: number | null;
  imagenes?: { url: string }[];
}

const CRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

const marginColor = (margen: number) => {
  if (margen < 0) return styles.negative;
  if (margen < 5) return styles.warning;
  return styles.positive;
};

export const PricingPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editing, setEditing] = useState<Record<number, { precio_venta: string; precio_venta_usd: string; descuento: string }>>({});
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/vehicles");
      setVehicles(res.data.filter((v: Vehicle) => v.estado !== "Vendido"));
    } catch { toast.error("No se pudo cargar el inventario."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const startEdit = (v: Vehicle) => {
    setEditing(prev => ({
      ...prev,
      [v.id]: {
        precio_venta: String(v.precio_venta ?? v.precio_costo),
        precio_venta_usd: v.precio_venta_usd != null ? String(v.precio_venta_usd) : "",
        descuento: String(v.descuento_porcentaje ?? 0),
      }
    }));
  };

  const cancelEdit = (id: number) => {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleSave = async (v: Vehicle) => {
    const e = editing[v.id];
    const precio_venta = parseFloat(e.precio_venta.replace(/,/g, ""));
    const precio_venta_usd = e.precio_venta_usd.trim()
      ? parseFloat(e.precio_venta_usd.replace(/,/g, ""))
      : null;
    const descuento = parseFloat(e.descuento);

    if (isNaN(precio_venta) || precio_venta <= 0) return toast.error("Precio de venta inválido.");
    if (precio_venta_usd !== null && (isNaN(precio_venta_usd) || precio_venta_usd <= 0))
      return toast.error("Precio USD inválido.");
    if (isNaN(descuento) || descuento < 0 || descuento > 100) return toast.error("Descuento debe ser entre 0 y 100.");

    const precioFinal = precio_venta * (1 - descuento / 100);
    const bajoCosto = precioFinal < Number(v.precio_costo);

    if (bajoCosto) {
      const ok = window.confirm(
        `⚠️ ALERTA: El precio final (${CRC(precioFinal)}) es INFERIOR al costo de inventario (${CRC(v.precio_costo)}).\n\n¿Confirmas que deseas guardar este precio?`
      );
      if (!ok) return;
    }

    try {
      await apiClient.patch(`/vehicles/${v.id}/pricing`, {
        precio_venta,
        precio_venta_usd,
        descuento_porcentaje: descuento,
      });
      toast.success(`✅ Precio actualizado${bajoCosto ? " — ⚠️ venta bajo costo" : ""}`);
      cancelEdit(v.id);
      fetch();
    } catch { toast.error("Error al guardar el precio."); }
  };

  const getPreview = (v: Vehicle) => {
    const e = editing[v.id];
    if (!e) return null;
    const pv = parseFloat(e.precio_venta.replace(/,/g, "")) || 0;
    const d = parseFloat(e.descuento) || 0;
    const final = pv * (1 - d / 100);
    const costo = Number(v.precio_costo);
    const margen = costo > 0 ? ((final - costo) / costo) * 100 : 0;
    return { final, margen, bajoCosto: final < costo };
  };

  if (loading) return <p style={{ padding: "2rem" }}>Cargando...</p>;

  return (
    <div className={styles.container}>
      <h1>Gestión de Precios</h1>
      <p className={styles.subtitle}>
        Administra el precio de lista y descuentos de cada vehículo. El sistema alerta cuando el precio final es inferior al costo de inventario.
      </p>

      <div className={styles.legend}>
        <span className={styles.positive}>● Margen saludable (&gt;5%)</span>
        <span className={styles.warning}>● Margen bajo (0–5%)</span>
        <span className={styles.negative}>● Precio bajo costo</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>VIN</th>
              <th>Costo Inventario</th>
              <th>Precio de Lista</th>
              <th>Precio USD</th>
              <th>Descuento %</th>
              <th>Precio Final</th>
              <th>Margen</th>
              <th>Visibilidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => {
              const isEditing = !!editing[v.id];
              const preview = getPreview(v);
              const costo      = Number(v.precio_costo);
              const precioFinal = Number(v.precio_venta_final ?? v.precio_venta);
              const margen = costo > 0 ? ((precioFinal - costo) / costo) * 100 : 0;

              return (
                <tr key={v.id} className={isEditing ? styles.editingRow : ""}>
                  <td>
                    <div className={styles.vehicleCell}>
                      <div className={styles.thumbWrapper}>
                        {v.imagenes?.[0] && (
                          <img src={getImageUrl(v.imagenes[0].url)} alt="" className={styles.thumb} />
                        )}
                        <VehicleRibbon visibilidad={v.visibilidad} clasificacion={v.clasificacion_inventario} />
                      </div>
                      <div>
                        <strong>{v.marca} {v.modelo}</strong>
                        <br /><small>{v.año} · {v.color}</small>
                      </div>
                    </div>
                  </td>
                  <td className={styles.vin}>{v.vin}</td>
                  <td className={styles.cost}>{CRC(v.precio_costo)}</td>

                  {/* Precio de lista editable */}
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing[v.id].precio_venta}
                        onChange={e => setEditing(prev => ({ ...prev, [v.id]: { ...prev[v.id], precio_venta: e.target.value } }))}
                        className={styles.priceInput}
                      />
                    ) : CRC(v.precio_venta)}
                  </td>

                  {/* Precio USD */}
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="—"
                        value={editing[v.id].precio_venta_usd}
                        onChange={e => setEditing(prev => ({ ...prev, [v.id]: { ...prev[v.id], precio_venta_usd: e.target.value } }))}
                        className={styles.priceInput}
                      />
                    ) : (v.precio_venta_usd
                          ? `$${Number(v.precio_venta_usd).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                          : "—")}
                  </td>

                  {/* Descuento */}
                  <td>
                    {isEditing ? (
                      <div className={styles.discountInput}>
                        <input
                          type="number"
                          min="0" max="100" step="0.5"
                          value={editing[v.id].descuento}
                          onChange={e => setEditing(prev => ({ ...prev, [v.id]: { ...prev[v.id], descuento: e.target.value } }))}
                          className={styles.discountField}
                        />
                        <span>%</span>
                      </div>
                    ) : (
                      <span className={v.descuento_porcentaje ? styles.discountBadge : ""}>
                        {v.descuento_porcentaje ? `${v.descuento_porcentaje}%` : "—"}
                      </span>
                    )}
                  </td>

                  {/* Precio final (preview en edición) */}
                  <td>
                    {isEditing && preview ? (
                      <span className={preview.bajoCosto ? styles.alertPrice : styles.finalPrice}>
                        {CRC(preview.final)}
                        {preview.bajoCosto && " ⚠️"}
                      </span>
                    ) : (
                      <span className={precioFinal < costo ? styles.alertPrice : styles.finalPrice}>
                        {CRC(precioFinal)}
                        {precioFinal < costo && " ⚠️"}
                      </span>
                    )}
                  </td>

                  {/* Margen */}
                  <td>
                    {isEditing && preview ? (
                      <span className={`${styles.margenBadge} ${marginColor(preview.margen)}`}>
                        {preview.margen.toFixed(1)}%
                      </span>
                    ) : (
                      <span className={`${styles.margenBadge} ${marginColor(margen)}`}>
                        {margen.toFixed(1)}%
                      </span>
                    )}
                  </td>

                  {/* Visibilidad */}
                  <td>
                    <VisibilityButtons
                      vehicleId={v.id}
                      current={v.visibilidad ?? "Visible"}
                      clasificacion={v.clasificacion_inventario ?? "En Stock"}
                      onChanged={(val) =>
                        setVehicles(prev =>
                          prev.map(x => x.id === v.id ? { ...x, visibilidad: val } : x)
                        )
                      }
                      onClasificacionChanged={(val) =>
                        setVehicles(prev =>
                          prev.map(x => x.id === v.id ? { ...x, clasificacion_inventario: val } : x)
                        )
                      }
                    />
                  </td>

                  {/* Acciones */}
                  <td>
                    {isEditing ? (
                      <div className={styles.actions}>
                        <button className={styles.saveBtn} onClick={() => handleSave(v)}>Guardar</button>
                        <button className={styles.cancelBtn} onClick={() => cancelEdit(v.id)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className={styles.editBtn} onClick={() => startEdit(v)}>Editar precio</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
