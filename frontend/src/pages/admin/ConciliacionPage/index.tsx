import { useState, useEffect, useRef, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuBanknote, LuUpload, LuLink } from "react-icons/lu";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "6px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", textAlign: "left" };
const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "6px 10px", color: "#334155", fontSize: "0.82rem" };
const tdR: React.CSSProperties = { ...td, textAlign: "right" };
const inp: React.CSSProperties = { padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit" };
const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => hoy().slice(0, 8) + "01";

export const ConciliacionPage = () => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [rep, setRep] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get("/tesoreria/cuentas").then((r) => {
      setCuentas(r.data ?? []);
      if (r.data?.[0]) setCuentaId(r.data[0].id);
    }).catch(() => toast.error("No se pudieron cargar las cuentas bancarias."));
  }, []);

  const cargarReporte = useCallback(async () => {
    if (!cuentaId) return;
    try {
      const r = await apiClient.get(`/conciliacion/${cuentaId}/reporte?desde=${desde}&hasta=${hasta}`);
      setRep(r.data);
    } catch { /* silencioso */ }
  }, [cuentaId, desde, hasta]);

  useEffect(() => { cargarReporte(); }, [cargarReporte]);

  const importar = async (file: File) => {
    if (!cuentaId) return;
    setBusy(true);
    const tId = toast.loading("Importando estado de cuenta…");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await apiClient.post(`/conciliacion/${cuentaId}/importar`, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`${r.data.importados} movimientos importados.`, { id: tId });
      cargarReporte();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al importar.", { id: tId }); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const conciliar = async () => {
    if (!cuentaId) return;
    setBusy(true);
    const tId = toast.loading("Conciliando…");
    try {
      const r = await apiClient.post(`/conciliacion/${cuentaId}/conciliar`, { desde, hasta, tolerancia: 3 });
      toast.success(`${r.data.conciliados} movimientos conciliados.`, { id: tId });
      setRep(r.data);
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al conciliar.", { id: tId }); }
    finally { setBusy(false); }
  };

  const crearAsiento = async (movId: number) => {
    try {
      await apiClient.post(`/conciliacion/movimiento/${movId}/asiento`, {});
      toast.success("Asiento creado y movimiento conciliado.");
      cargarReporte();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al crear el asiento."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ margin: 0, color: "#0a2540", display: "flex", alignItems: "center", gap: "0.5rem" }}><LuBanknote size={22} /> Conciliación Bancaria</h1>

      <div style={card}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <select style={inp} value={cuentaId ?? ""} onChange={(e) => setCuentaId(Number(e.target.value))}>
            {cuentas.map((c) => <option key={c.id} value={c.id}>{c.banco} · {c.numero_cuenta} ({c.moneda})</option>)}
          </select>
          <input type="date" style={inp} value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" style={inp} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); }} />
          <button disabled={busy} onClick={() => fileRef.current?.click()} style={{ background: "#fff", border: "1.5px solid #024f7d", color: "#024f7d", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuUpload size={16} /> Importar extracto (CSV)</button>
          <button disabled={busy} onClick={conciliar} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuLink size={16} /> Conciliar automáticamente</button>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.6rem 0 0" }}>
          CSV: <code>fecha,descripcion,monto,referencia</code> — monto firmado (+ entrada / − salida). Ej: <code>2026-05-10,Depósito cliente,150000,REF123</code>
        </p>
      </div>

      {rep && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {[
              ["Saldo según libros", rep.saldoLibros, "#024f7d"],
              ["(−) En libros no en banco", rep.partidasLibrosNoBanco, "#b45309"],
              ["(+) En banco no en libros", rep.partidasBancoNoLibros, "#b45309"],
              ["= Saldo según banco", rep.saldoBanco, "#059669"],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ ...card, padding: "0.9rem 1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{l as string}</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: c as string }}>{CRC(v as number)}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <strong style={{ color: "#0a2540" }}>En libros, no en banco (en tránsito)</strong>
            <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead><tr><th style={th}>Fecha</th><th style={th}>Asiento</th><th style={th}>Descripción</th><th style={thR}>Monto</th></tr></thead>
                <tbody>
                  {rep.enLibrosNoEnBanco.length === 0 && <tr><td style={td} colSpan={4}>Nada pendiente. ✓</td></tr>}
                  {rep.enLibrosNoEnBanco.map((l: any) => (
                    <tr key={l.lineaId} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={td}>{l.fecha}</td><td style={td}>#{l.asientoId}</td><td style={td}>{l.descripcion}</td>
                      <td style={tdR}>{CRC(l.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <strong style={{ color: "#0a2540" }}>En banco, no en libros (comisiones, intereses)</strong>
            <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead><tr><th style={th}>Fecha</th><th style={th}>Descripción</th><th style={thR}>Monto</th><th style={th}></th></tr></thead>
                <tbody>
                  {rep.enBancoNoEnLibros.length === 0 && <tr><td style={td} colSpan={4}>Nada pendiente. ✓</td></tr>}
                  {rep.enBancoNoEnLibros.map((m: any) => (
                    <tr key={m.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={td}>{m.fecha}</td><td style={td}>{m.descripcion}</td>
                      <td style={{ ...tdR, color: m.monto < 0 ? "#dc2626" : "#059669" }}>{CRC(m.monto)}</td>
                      <td style={tdR}>
                        <button onClick={() => crearAsiento(m.id)} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: "0.75rem" }}>
                          Crear asiento
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConciliacionPage;
