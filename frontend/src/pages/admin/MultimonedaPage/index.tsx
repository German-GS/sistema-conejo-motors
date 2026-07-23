import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuWallet, LuRefreshCw } from "react-icons/lu";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 2 }).format(Number(v) || 0);
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "6px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", textAlign: "left" };
const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "6px 10px", color: "#334155", fontSize: "0.82rem" };
const tdR: React.CSSProperties = { ...td, textAlign: "right" };
const inp: React.CSSProperties = { padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit" };
const hoy = () => new Date().toISOString().slice(0, 10);
const mesActual = () => new Date().toISOString().slice(0, 7);

export const MultimonedaPage = () => {
  const [historial, setHistorial] = useState<any[]>([]);
  const [fecha, setFecha] = useState(hoy());
  const [venta, setVenta] = useState("");
  const [periodo, setPeriodo] = useState(mesActual());
  const [tcManual, setTcManual] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    try { setHistorial((await apiClient.get("/tipo-cambio")).data ?? []); } catch { /* silencioso */ }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const sincronizar = async () => {
    setBusy(true);
    const tId = toast.loading("Consultando Hacienda…");
    try {
      const r = await apiClient.post("/tipo-cambio/sincronizar");
      toast.success(r.data?.venta ? `TC de hoy: ₡${r.data.venta}` : "Sin datos; usá carga manual.", { id: tId });
      cargar();
    } catch { toast.error("No se pudo sincronizar.", { id: tId }); }
    finally { setBusy(false); }
  };

  const guardarManual = async () => {
    if (!venta) { toast.error("Ingresá el valor de venta."); return; }
    try {
      await apiClient.post("/tipo-cambio", { fecha, venta: Number(venta) });
      toast.success("Tipo de cambio guardado.");
      setVenta(""); cargar();
    } catch { toast.error("Error al guardar."); }
  };

  const revaluar = async () => {
    setBusy(true);
    const tId = toast.loading("Revaluando…");
    try {
      const r = await apiClient.post("/tipo-cambio/revaluar", { periodo, tipoCambio: tcManual ? Number(tcManual) : undefined });
      setResultado(r.data);
      if (r.data.yaRevaluado) toast("Ya estaba revaluado este período.", { id: tId, icon: "ℹ️" });
      else if (r.data.sinDiferencias) toast("Sin documentos en USD para revaluar.", { id: tId, icon: "ℹ️" });
      else toast.success(`Diferencial registrado (${r.data.documentos} docs).`, { id: tId });
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al revaluar.", { id: tId }); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ margin: 0, color: "#0a2540", display: "flex", alignItems: "center", gap: "0.5rem" }}><LuWallet size={22} /> Multimoneda — Tipo de Cambio y Diferencial</h1>

      <div style={card}>
        <strong style={{ color: "#0a2540" }}>Tipo de cambio del dólar</strong>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.75rem" }}>
          <button disabled={busy} onClick={sincronizar} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}><LuRefreshCw size={15} /> Sincronizar hoy (Hacienda)</button>
          <span style={{ width: 1, height: 24, background: "#e2e8f0" }} />
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Carga manual:</label>
          <input type="date" style={inp} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <input type="number" step="0.01" style={{ ...inp, width: 120 }} placeholder="Venta ₡" value={venta} onChange={(e) => setVenta(e.target.value)} />
          <button onClick={guardarManual} style={{ background: "#059669", border: "none", color: "#fff", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700 }}>Guardar</button>
        </div>
        {historial.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
              <thead><tr><th style={th}>Fecha</th><th style={thR}>Compra</th><th style={thR}>Venta</th><th style={th}>Fuente</th></tr></thead>
              <tbody>
                {historial.slice(0, 12).map((t) => (
                  <tr key={t.fecha} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td}>{t.fecha}</td><td style={tdR}>{CRC(t.compra)}</td><td style={tdR}>{CRC(t.venta)}</td><td style={td}>{t.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={card}>
        <strong style={{ color: "#0a2540" }}>Diferencial cambiario del período</strong>
        <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.35rem 0 0.75rem" }}>
          Revalúa los saldos en USD (CxC/CxP) al TC de cierre y registra la ganancia/pérdida cambiaria. Idempotente: no se duplica si se corre dos veces.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="month" style={inp} value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          <input type="number" step="0.01" style={{ ...inp, width: 180 }} placeholder="TC cierre (opcional)" value={tcManual} onChange={(e) => setTcManual(e.target.value)} />
          <button disabled={busy} onClick={revaluar} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.5rem 1.1rem", cursor: "pointer", fontWeight: 700 }}>Revaluar período</button>
        </div>
        {resultado?.detalle?.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead><tr><th style={th}>Doc.</th><th style={thR}>USD</th><th style={thR}>TC ant.</th><th style={thR}>TC cierre</th><th style={thR}>Saldo ant.</th><th style={thR}>Saldo nuevo</th><th style={thR}>Diferencia</th></tr></thead>
              <tbody>
                {resultado.detalle.map((d: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td}>{d.tipo} {d.numero}</td><td style={tdR}>${d.usd}</td>
                    <td style={tdR}>{d.tcAnterior}</td><td style={tdR}>{d.tcCierre}</td>
                    <td style={tdR}>{CRC(d.saldoAnterior)}</td><td style={tdR}>{CRC(d.saldoNuevo)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: d.diferencia >= 0 ? "#059669" : "#dc2626" }}>{CRC(d.diferencia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultimonedaPage;
