import { useState, useEffect, useMemo } from "react";
import apiClient from "@/api/apiClient";
import { fmtFechaLocal } from "@/utils/dateUtils";
import toast from "react-hot-toast";
import {
  LuUsers, LuCar, LuFileText, LuReceiptText, LuClipboardList,
  LuLock, LuCircleCheck, LuCircleAlert,
} from "react-icons/lu";

const CRC = (v: number) => "₡" + (Number(v) || 0).toLocaleString("es-CR");

/** Abre la proforma imprimible de una cotización (endpoint autenticado → blob). */
async function verProforma(id: number) {
  const tId = toast.loading("Generando proforma…");
  try {
    const res = await apiClient.get(`/billing/proforma/${id}`, { responseType: "text" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "text/html" }));
    window.open(url, "_blank");
    toast.dismiss(tId);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch { toast.error("No se pudo generar la proforma.", { id: tId }); }
}

interface ClienteLista {
  id: number;
  nombre_completo: string;
  cedula: string;
  telefono?: string;
  email?: string;
  cotizaciones: number;
  vehiculos: number;
}

export const ClientesPage = () => {
  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  useEffect(() => {
    apiClient.get("/clientes")
      .then((r) => setClientes(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const abrir = (id: number) => {
    setSel(id);
    setPerfil(null);
    setLoadingPerfil(true);
    apiClient.get(`/clientes/${id}`)
      .then((r) => setPerfil(r.data))
      .catch(() => {})
      .finally(() => setLoadingPerfil(false));
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      `${c.nombre_completo} ${c.cedula} ${c.telefono ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [clientes, busqueda]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0a2540", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><LuUsers size={22} /> Clientes</h1>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, cédula, teléfono…"
          style={{ padding: "0.55rem 0.9rem", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", minWidth: 280, fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(340px, 1.2fr)", gap: "1.25rem", alignItems: "start" }}>
        {/* Lista */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Cargando…</p>
          ) : filtrados.length === 0 ? (
            <p style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Sin clientes.</p>
          ) : (
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {filtrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => abrir(c.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    border: "none", borderBottom: "1px solid #f1f5f9",
                    background: sel === c.id ? "#eff6ff" : "#fff", padding: "0.75rem 1rem", fontFamily: "inherit",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <strong style={{ color: "#0a2540" }}>{c.nombre_completo}</strong>
                    <span style={{ display: "flex", gap: "0.4rem" }}>
                      {c.vehiculos > 0 && <span title="Vehículos comprados" style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "1px 8px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><LuCar size={12} /> {c.vehiculos}</span>}
                      <span title="Cotizaciones" style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#475569", borderRadius: 20, padding: "1px 8px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><LuFileText size={12} /> {c.cotizaciones}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.cedula} · {c.telefono || "sin tel."}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem", minHeight: 300 }}>
          {!sel ? (
            <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "2rem" }}>Seleccioná un cliente para ver su perfil.</p>
          ) : loadingPerfil || !perfil ? (
            <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "2rem" }}>Cargando perfil…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Datos */}
              <div>
                <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", color: "#0a2540" }}>{perfil.cliente.nombre_completo}</h2>
                <div style={{ fontSize: "0.88rem", color: "#334155", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span><strong>Cédula:</strong> {perfil.cliente.cedula}</span>
                  <span><strong>Teléfono:</strong> {perfil.cliente.telefono || "—"}</span>
                  <span><strong>Email:</strong> {perfil.cliente.email || "—"}</span>
                  {perfil.cliente.direccion && <span><strong>Dirección:</strong> {perfil.cliente.direccion}</span>}
                </div>
              </div>

              {/* Vehículos comprados */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><LuCar size={14} /> Vehículos comprados</div>
                {perfil.vehiculos.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>Aún no ha comprado vehículos.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {perfil.vehiculos.map((v: any) => (
                      <div key={v.ventaId} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.9rem" }}>{v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ""}</strong>
                          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{v.fecha_venta ? fmtFechaLocal(v.fecha_venta) : ""}</span>
                        </div>
                        {v.vin && <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>VIN: {v.vin}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cotizaciones / Proformas */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><LuReceiptText size={14} /> Cotizaciones / Proformas</div>
                {(!perfil.cotizaciones || perfil.cotizaciones.length === 0) ? (
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>Sin cotizaciones. Creá una desde el lead.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {perfil.cotizaciones.map((c: any) => (
                      <div key={c.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.6rem 0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0a2540" }}>#{c.id} · {c.vehiculo}</div>
                          <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{c.fecha ? fmtFechaLocal(c.fecha) : ""} · {c.estado} · {CRC(c.total)}</div>
                        </div>
                        <button onClick={() => verProforma(c.id)}
                          style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          <LuReceiptText size={14} /> Ver Proforma
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expediente SUGEF */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><LuClipboardList size={14} /> Expediente SUGEF</div>
                {(() => {
                  const e = perfil.expediente;
                  return (
                    <div style={{ background: e.bajoRetencion ? "#f0fdf4" : "#fff", border: `1px solid ${e.bajoRetencion ? "#16a34a" : "#e2e8f0"}`, borderRadius: 8, padding: "0.6rem 0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        {e.bajoRetencion ? <LuLock size={14} /> : e.kycCompleto ? <LuCircleCheck size={14} color="#16a34a" /> : <LuCircleAlert size={14} color="#eab308" />}
                        {e.bajoRetencion
                          ? `Bajo retención hasta ${fmtFechaLocal(e.retencion?.retener_hasta)}`
                          : e.kycCompleto ? "Expediente completo" : "Expediente incompleto"}
                      </span>
                      <a href={`/admin/leads/${e.leadId}`} style={{ fontSize: "0.8rem", color: "#024f7d", fontWeight: 600, textDecoration: "none" }}>Ver expediente →</a>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
