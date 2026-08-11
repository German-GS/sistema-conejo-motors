import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuTriangleAlert, LuRefreshCw, LuCircleCheck } from "react-icons/lu";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "8px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#64748b", textAlign: "left" };
const td: React.CSSProperties = { padding: "8px 10px", color: "#334155", fontSize: "0.85rem", verticalAlign: "top" };

const ORIGEN_LABEL: Record<string, string> = {
  ActivoFijo: "Activo fijo",
  LiquidacionIVA: "Liquidación IVA",
};

export const PendientesContablesPage = () => {
  const [data, setData] = useState<{ total: number; documentos: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/pendientes-contables");
      setData(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "No se pudieron cargar los pendientes.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, color: "var(--brand-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}><LuTriangleAlert size={22} /> Pendientes de Contabilizar</h1>
        <button onClick={cargar} style={{ background: "#fff", border: "1.5px solid #e2e8f0", color: "#475569", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}><LuRefreshCw size={15} /> Actualizar</button>
      </div>

      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
        Documentos cuyo asiento contable falló al registrarse y quedaron marcados para reconciliación.
        Corregí la causa (p. ej. plan de cuentas o período cerrado) y reintentá la operación de origen.
      </p>

      {loading && <p style={{ padding: "1rem", color: "#64748b" }}>Cargando…</p>}

      {!loading && data && data.total === 0 && (
        <div style={{ ...card, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <LuCircleCheck size={24} />
          <strong>Todo al día — no hay documentos pendientes de contabilizar.</strong>
        </div>
      )}

      {!loading && data && data.total > 0 && (
        <div style={card}>
          <div style={{ marginBottom: "0.75rem", fontWeight: 700, color: "#92400e" }}>
            {data.total} documento{data.total !== 1 ? "s" : ""} pendiente{data.total !== 1 ? "s" : ""}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead><tr><th style={th}>Origen</th><th style={th}>ID</th><th style={th}>Descripción</th><th style={th}>Fecha</th><th style={th}>Error</th></tr></thead>
              <tbody>
                {data.documentos.map((d, i) => (
                  <tr key={`${d.origen}-${d.id}-${i}`} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td}><span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#fef3c7", color: "#92400e", borderRadius: 20, padding: "2px 10px" }}>{ORIGEN_LABEL[d.origen] ?? d.origen}</span></td>
                    <td style={td}>#{d.id}</td>
                    <td style={td}>{d.descripcion}</td>
                    <td style={td}>{d.fecha ?? "—"}</td>
                    <td style={{ ...td, color: "#b91c1c", maxWidth: 320, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{d.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendientesContablesPage;
