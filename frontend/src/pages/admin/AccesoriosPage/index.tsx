import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./AccesoriosPage.module.css";

interface Accesorio {
  id: number;
  vehiculo: { id: number; vin: string; marca: string; modelo: string; color: string; año: number };
  color_interior: string;
  observaciones: string;
  cargador_pared: string;
  extension_cargador: string;
  triangulos_seguridad: string;
  manuales: string;
  llave_control: string;
  gas_inflar_llantas: string;
  compresor_llantas: string;
  llave_ruedas: string;
  set_escobillas: string;
  filtro_polen: string;
  entregado_al_cliente: boolean;
}

const CAMPOS_ACCESORIOS: { key: keyof Accesorio; label: string }[] = [
  { key: "cargador_pared", label: "Cargador de pared" },
  { key: "extension_cargador", label: "Extensión cargador" },
  { key: "triangulos_seguridad", label: "Triángulos seguridad" },
  { key: "manuales", label: "Manuales" },
  { key: "llave_control", label: "Llave y control" },
  { key: "gas_inflar_llantas", label: "Gas inflar llantas" },
  { key: "compresor_llantas", label: "Compresor llantas" },
  { key: "llave_ruedas", label: "Llave de ruedas" },
  { key: "set_escobillas", label: "Set escobillas" },
  { key: "filtro_polen", label: "Filtro de polen" },
];

const OPCIONES = ["✅", "❌", "🔲"];

const EstadoBadge = ({ valor }: { valor: string }) => {
  if (valor === "✅") return <span className={styles.ok}>✅</span>;
  if (valor === "❌") return <span className={styles.missing}>❌</span>;
  return <span className={styles.pending}>🔲</span>;
};

export const AccesoriosPage = () => {
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Accesorio>>({});
  const [loading, setLoading] = useState(true);

  const fetchAccesorios = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/accesorios");
      setAccesorios(res.data);
    } catch {
      toast.error("No se pudieron cargar los accesorios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccesorios(); }, []);

  const startEdit = (acc: Accesorio) => {
    setEditingId(acc.vehiculo.id);
    setEditData({ ...acc });
  };

  const handleChange = (field: string, value: string | boolean) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await apiClient.patch(`/accesorios/${editingId}`, editData);
      toast.success("Accesorios actualizados.");
      setEditingId(null);
      fetchAccesorios();
    } catch {
      toast.error("Error al guardar.");
    }
  };

  if (loading) return <p style={{ padding: "2rem" }}>Cargando accesorios...</p>;

  return (
    <div className={styles.container}>
      <h1>Accesorios por Vehículo</h1>
      <p className={styles.subtitle}>
        ✅ = Llegó con el vehículo &nbsp;|&nbsp; ❌ = No llegó / falta &nbsp;|&nbsp; 🔲 = Pendiente verificar
      </p>

      {accesorios.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay registros de accesorios. Importa vehículos desde el Excel para generarlos automáticamente.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>VIN</th>
                <th>Vehículo</th>
                <th>Color Int.</th>
                {CAMPOS_ACCESORIOS.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Entregado</th>
                <th>Obs.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {accesorios.map((acc) => {
                const isEditing = editingId === acc.vehiculo.id;
                return (
                  <tr key={acc.id} className={isEditing ? styles.editingRow : ""}>
                    <td className={styles.vin}>{acc.vehiculo.vin}</td>
                    <td>
                      <strong>{acc.vehiculo.marca} {acc.vehiculo.modelo}</strong>
                      <br />
                      <small>{acc.vehiculo.color} · {acc.vehiculo.año}</small>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={(editData.color_interior as string) ?? ""}
                          onChange={(e) => handleChange("color_interior", e.target.value)}
                          className={styles.smallInput}
                        />
                      ) : acc.color_interior || "—"}
                    </td>
                    {CAMPOS_ACCESORIOS.map((campo) => (
                      <td key={campo.key} style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <select
                            value={(editData[campo.key] as string) ?? "🔲"}
                            onChange={(e) => handleChange(campo.key, e.target.value)}
                            className={styles.selectAcc}
                          >
                            {OPCIONES.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <EstadoBadge valor={(acc[campo.key] as string) ?? "🔲"} />
                        )}
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={!!editData.entregado_al_cliente}
                          onChange={(e) => handleChange("entregado_al_cliente", e.target.checked)}
                        />
                      ) : (
                        acc.entregado_al_cliente ? "✅" : "—"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={(editData.observaciones as string) ?? ""}
                          onChange={(e) => handleChange("observaciones", e.target.value)}
                          className={styles.smallInput}
                        />
                      ) : (
                        <span title={acc.observaciones ?? ""}>{acc.observaciones ? "📝" : "—"}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className={styles.editActions}>
                          <button className={styles.saveBtn} onClick={handleSave}>Guardar</button>
                          <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      ) : (
                        <button className={styles.editBtn} onClick={() => startEdit(acc)}>Editar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
