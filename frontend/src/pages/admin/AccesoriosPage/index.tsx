import { useState, useEffect, useMemo } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./AccesoriosPage.module.css";
import {
  LuPlug, LuCable, LuTriangleAlert, LuBookOpen, LuKeyRound, LuWind,
  LuDisc, LuWrench, LuSparkles, LuFan, LuClipboardList,
  LuPalette, LuNotebookPen, LuPencil,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { PageHeader, Badge, Button } from "@/components/ui";

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

const CAMPOS: { key: keyof Accesorio; label: string; Icon: IconType }[] = [
  { key: "cargador_pared", label: "Cargador de pared", Icon: LuPlug },
  { key: "extension_cargador", label: "Extensión cargador", Icon: LuCable },
  { key: "triangulos_seguridad", label: "Triángulos seguridad", Icon: LuTriangleAlert },
  { key: "manuales", label: "Manuales", Icon: LuBookOpen },
  { key: "llave_control", label: "Llave y control", Icon: LuKeyRound },
  { key: "gas_inflar_llantas", label: "Gas inflar llantas", Icon: LuWind },
  { key: "compresor_llantas", label: "Compresor llantas", Icon: LuDisc },
  { key: "llave_ruedas", label: "Llave de ruedas", Icon: LuWrench },
  { key: "set_escobillas", label: "Set escobillas", Icon: LuSparkles },
  { key: "filtro_polen", label: "Filtro de polen", Icon: LuFan },
];

const COLOR_HEX: Record<string, string> = {
  negro: "#111827", blanco: "var(--slate-50)", gris: "#9ca3af", plateado: "var(--slate-300)", plata: "var(--slate-300)",
  celeste: "#7dd3fc", azul: "#2563eb", rojo: "var(--danger)", verde: "#16a34a", amarillo: "#eab308",
  naranja: "#f97316", morado: "#7c3aed", dorado: "#d4af37", beige: "#e7dcc8", vino: "#7f1d1d",
};
const colorHex = (c?: string) => COLOR_HEX[(c ?? "").trim().toLowerCase()] ?? "var(--slate-300)";

// Estados posibles y ciclo al hacer clic en edición
const CICLO: Record<string, string> = { "✅": "❌", "❌": "🔲", "🔲": "✅" };
const norm = (v?: string) => (v === "✅" || v === "❌" ? v : "🔲");

const estiloEstado = (v: string): React.CSSProperties => {
  if (v === "✅") return { background: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" };
  if (v === "❌") return { background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" };
  return { background: "var(--slate-50)", color: "var(--slate-400)", borderColor: "var(--slate-200)" };
};

export const AccesoriosPage = () => {
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Accesorio>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "incompletos" | "no_entregados">("todos");

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

  const startEdit = (acc: Accesorio) => { setEditingId(acc.vehiculo.id); setEditData({ ...acc }); };
  const cancelar = () => { setEditingId(null); setEditData({}); };
  const change = (field: string, value: string | boolean) => setEditData((p) => ({ ...p, [field]: value }));
  const ciclar = (key: keyof Accesorio) => change(key, CICLO[norm(editData[key] as string)]);

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await apiClient.patch(`/accesorios/${editingId}`, editData);
      toast.success("Accesorios actualizados.");
      cancelar();
      fetchAccesorios();
    } catch {
      toast.error("Error al guardar.");
    }
  };

  const copyVin = (vin: string) =>
    navigator.clipboard?.writeText(vin).then(() => toast.success(`VIN copiado: ${vin}`)).catch(() => {});

  const contar = (acc: Accesorio) => CAMPOS.filter((c) => acc[c.key] === "✅").length;

  const filtrados = useMemo(() => {
    let list = accesorios;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => `${a.vehiculo.marca} ${a.vehiculo.modelo} ${a.vehiculo.vin} ${a.vehiculo.color}`.toLowerCase().includes(q));
    }
    if (filtro === "incompletos") list = list.filter((a) => contar(a) < CAMPOS.length);
    if (filtro === "no_entregados") list = list.filter((a) => !a.entregado_al_cliente);
    return list;
  }, [accesorios, search, filtro]);

  const completos = accesorios.filter((a) => contar(a) === CAMPOS.length).length;

  if (loading) return <p style={{ padding: "2rem" }}>Cargando accesorios...</p>;

  return (
    <div className={styles.container}>
      <PageHeader
        title="Accesorios por Vehículo"
        subtitle="✅ Llegó con el vehículo · ❌ No llegó / falta · 🔲 Pendiente verificar — en edición, tocá cada ítem para cambiar su estado."
      />

      {/* Resumen + filtros */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", margin: "0.5rem 0 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Badge variant="info">{accesorios.length} vehículos</Badge>
          <Badge variant="success">{completos} completos</Badge>
          <Badge variant="warning">{accesorios.length - completos} pendientes</Badge>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por marca, modelo, VIN, color…"
          style={{ flex: "1 1 240px", minWidth: 220, padding: "0.5rem 0.8rem", borderRadius: 10, border: "1.5px solid var(--slate-200)", fontSize: "0.88rem", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {([["todos", "Todos"], ["incompletos", "Incompletos"], ["no_entregados", "No entregados"]] as const).map(([k, l]) => (
            <Button
              key={k}
              size="sm"
              variant={filtro === k ? "primary" : "secondary"}
              onClick={() => setFiltro(k)}
            >{l}</Button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className={styles.empty}>
          <p>{accesorios.length === 0 ? "No hay registros de accesorios. Importá vehículos desde el Excel para generarlos automáticamente." : "Ningún vehículo coincide con el filtro."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
          {filtrados.map((acc) => {
            const isEditing = editingId === acc.vehiculo.id;
            const total = CAMPOS.length;
            const ok = contar(acc);
            const pct = Math.round((ok / total) * 100);
            return (
              <div key={acc.id} style={{ background: "#fff", border: `1px solid ${isEditing ? "var(--brand)" : "var(--slate-200)"}`, borderRadius: 12, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Encabezado */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span title={acc.vehiculo.color} style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex(acc.vehiculo.color), border: "1.5px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                      <strong style={{ color: "var(--brand-dark)" }}>{acc.vehiculo.marca} {acc.vehiculo.modelo}</strong>
                      <span style={{ color: "var(--slate-400)", fontSize: "0.82rem" }}>{acc.vehiculo.año}</span>
                    </div>
                    <button onClick={() => copyVin(acc.vehiculo.vin)} title="Copiar VIN" style={{ marginTop: 4, background: "var(--slate-50)", border: "1px solid var(--slate-200)", borderRadius: 6, padding: "1px 7px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.74rem", color: "var(--slate-700)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuClipboardList size={13} /> {acc.vehiculo.vin}</button>
                  </div>
                  {acc.entregado_al_cliente && !isEditing && (
                    <Badge variant="success">✅ Entregado</Badge>
                  )}
                </div>

                {/* Progreso */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--slate-500)", marginBottom: 3 }}>
                    <span>Accesorios recibidos</span><strong style={{ color: pct === 100 ? "#15803d" : "var(--slate-700)" }}>{ok}/{total}</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--slate-100)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#16a34a" : pct >= 50 ? "var(--info)" : "var(--warning)", transition: "width 0.2s" }} />
                  </div>
                </div>

                {/* Checklist */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  {CAMPOS.map((campo) => {
                    const val = isEditing ? norm(editData[campo.key] as string) : norm(acc[campo.key] as string);
                    return (
                      <button
                        key={campo.key}
                        onClick={() => isEditing && ciclar(campo.key)}
                        disabled={!isEditing}
                        title={campo.label}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.35rem", textAlign: "left",
                          border: "1px solid", borderRadius: 8, padding: "0.35rem 0.5rem",
                          cursor: isEditing ? "pointer" : "default", fontSize: "0.76rem", fontWeight: 600,
                          ...estiloEstado(val),
                        }}
                      >
                        <span>{val}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><campo.Icon size={13} /> {campo.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Color interior / obs */}
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input value={(editData.color_interior as string) ?? ""} onChange={(e) => change("color_interior", e.target.value)} placeholder="Color interior" style={{ padding: "0.4rem 0.6rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.82rem", fontFamily: "inherit" }} />
                    <input value={(editData.observaciones as string) ?? ""} onChange={(e) => change("observaciones", e.target.value)} placeholder="Observaciones" style={{ padding: "0.4rem 0.6rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.82rem", fontFamily: "inherit" }} />
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "var(--slate-600)" }}>
                      <input type="checkbox" checked={!!editData.entregado_al_cliente} onChange={(e) => change("entregado_al_cliente", e.target.checked)} />
                      Entregado al cliente
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Button onClick={handleSave} size="sm" style={{ flex: 1 }}>Guardar</Button>
                      <Button onClick={cancelar} size="sm" variant="secondary">Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.8rem", color: "var(--slate-500)", borderTop: "1px solid var(--slate-100)", paddingTop: "0.6rem" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <LuPalette size={13} /> {acc.color_interior || "—"}{acc.observaciones ? <> · <LuNotebookPen size={13} /> {acc.observaciones}</> : ""}
                    </span>
                    <Button onClick={() => startEdit(acc)} size="sm" variant="secondary" icon={<LuPencil size={13} />}>Editar</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
