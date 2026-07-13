import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);
const TARIFA_LABEL: Record<string, string> = {
  T13: "Gravado 13%", T04: "4%", T02: "2%", T01: "1%", T005: "0,5%", Exento: "Exento", NoSujeto: "No sujeto",
};

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "6px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#64748b", textAlign: "left" };
const td: React.CSSProperties = { padding: "6px 10px", color: "#334155", fontSize: "0.85rem" };
const notaInp: React.CSSProperties = { display: "block", width: "100%", marginTop: 3, padding: "0.4rem 0.5rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.82rem", fontFamily: "inherit", boxSizing: "border-box" };

export const ObligacionesPage = () => {
  const [pendiente, setPendiente] = useState<any>(null);
  const [calc, setCalc] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [retenciones, setRetenciones] = useState(0);
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [nota, setNota] = useState({ tipo: "Credito", naturaleza: "Venta", base: "", iva: "", iva_tarifa: "T13", documento_ref: "", motivo: "" });
  const [periodoSel, setPeriodoSel] = useState("");

  const descargarXml = async () => {
    const periodo = periodoSel || pendiente?.periodo;
    if (!periodo) return;
    try {
      const res = await apiClient.get(`/iva/xml?periodo=${periodo}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/xml" }));
      const a = document.createElement("a");
      a.href = url; a.download = `D150-${periodo}-borrador.xml`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("No se pudo generar el XML."); }
  };

  const crearNota = async () => {
    const base = Number(nota.base) || 0;
    if (base <= 0) { toast.error("Ingresá la base de la nota."); return; }
    const iva = nota.iva !== "" ? Number(nota.iva) : +(base * (nota.iva_tarifa === "T13" ? 0.13 : nota.iva_tarifa === "T04" ? 0.04 : nota.iva_tarifa === "T02" ? 0.02 : nota.iva_tarifa === "T01" ? 0.01 : nota.iva_tarifa === "T005" ? 0.005 : 0)).toFixed(2);
    try {
      await apiClient.post("/notas-fiscales", { ...nota, base, iva });
      toast.success("Nota registrada. Ajusta el IVA del período.");
      setNota({ tipo: "Credito", naturaleza: "Venta", base: "", iva: "", iva_tarifa: "T13", documento_ref: "", motivo: "" });
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al registrar la nota."); }
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l] = await Promise.all([
        apiClient.get("/iva/pendiente"),
        apiClient.get("/iva/liquidaciones"),
      ]);
      setPendiente(p.data);
      setLiquidaciones(l.data ?? []);
      const periodo = periodoSel || p.data.periodo;
      if (!periodoSel) setPeriodoSel(p.data.periodo);
      const prev = await apiClient.get(`/iva/preview?periodo=${periodo}&retenciones=${retenciones}`);
      setCalc(prev.data.calc);
    } catch { toast.error("No se pudieron cargar las obligaciones."); }
    finally { setLoading(false); }
  }, [retenciones, periodoSel]);

  useEffect(() => { cargar(); }, [cargar]);

  const generar = async () => {
    const periodo = periodoSel || pendiente?.periodo;
    if (!periodo) return;
    setGenerando(true);
    try {
      await apiClient.post("/iva/generar", { periodo, retenciones, notas });
      toast.success(`Liquidación de ${periodo} generada.`);
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al generar."); }
    finally { setGenerando(false); }
  };

  const marcar = async (id: number, accion: "presentada" | "pagada") => {
    try {
      await apiClient.patch(`/iva/${id}/${accion}`);
      toast.success(accion === "presentada" ? "Marcada como presentada." : "Marcada como pagada (asiento generado).");
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error."); }
  };

  if (loading) return <p style={{ padding: "2rem" }}>Cargando obligaciones tributarias…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ margin: 0, color: "#0a2540" }}>🧾 Obligaciones Tributarias — IVA (D-150)</h1>

      {/* Banner de pendiente */}
      {pendiente?.pendiente && (
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 12, padding: "0.9rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.3rem" }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <strong>Declaración de IVA de {pendiente.periodo} pendiente.</strong>{" "}
            Se declara en TRIBU-CR dentro de los primeros 15 días naturales del mes. Declarar aunque sea en cero (omitirla = multa de ½ salario base).
          </div>
        </div>
      )}

      {/* Cálculo del período */}
      {calc && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <strong style={{ fontSize: "1.05rem", color: "#0a2540" }}>Período</strong>
              <input type="month" value={periodoSel} onChange={(e) => setPeriodoSel(e.target.value)} style={{ padding: "0.35rem 0.5rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem" }} />
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>(podés elegir cualquier mes para reconstruir hacia atrás)</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Prorrata: <strong>{calc.porcentaje_prorrata}%</strong></span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            {[
              ["Débito fiscal (ventas)", calc.debito_fiscal, "#dc2626"],
              ["Crédito fiscal bruto", calc.credito_fiscal_bruto, "#0891b2"],
              ["Crédito aplicable (prorrata)", calc.credito_fiscal_aplicable, "#059669"],
              ["IVA a pagar", calc.iva_a_pagar, calc.iva_a_pagar > 0 ? "#dc2626" : "#059669"],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{l as string}</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: c as string }}>{CRC(v as number)}</div>
              </div>
            ))}
          </div>

          {/* Desglose por tarifa (casillas D-150) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Ventas por tarifa</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Tarifa</th><th style={{ ...th, textAlign: "right" }}>Base</th><th style={{ ...th, textAlign: "right" }}>IVA</th></tr></thead>
                <tbody>
                  {Object.entries(calc.ventas_por_tarifa ?? {}).map(([k, v]: any) => (
                    <tr key={k} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={td}>{TARIFA_LABEL[k] ?? k}</td>
                      <td style={{ ...td, textAlign: "right" }}>{CRC(v.base)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{CRC(v.iva)}</td>
                    </tr>
                  ))}
                  {Object.keys(calc.ventas_por_tarifa ?? {}).length === 0 && <tr><td style={td} colSpan={3}>Sin ventas en el período.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Compras / crédito por tarifa</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Tarifa</th><th style={{ ...th, textAlign: "right" }}>Base</th><th style={{ ...th, textAlign: "right" }}>IVA</th></tr></thead>
                <tbody>
                  {Object.entries(calc.compras_por_tarifa ?? {}).map(([k, v]: any) => (
                    <tr key={k} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={td}>{TARIFA_LABEL[k] ?? k}</td>
                      <td style={{ ...td, textAlign: "right" }}>{CRC(v.base)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{CRC(v.iva)}</td>
                    </tr>
                  ))}
                  {Object.keys(calc.compras_por_tarifa ?? {}).length === 0 && <tr><td style={td} colSpan={3}>Sin crédito fiscal en el período.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Retenciones + generar */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Retenciones IVA (datáfono/tarjeta)
              <input type="number" value={retenciones} onChange={(e) => setRetenciones(Number(e.target.value))} style={{ display: "block", marginTop: 4, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", width: 160 }} />
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", flex: "1 1 200px" }}>Notas (opcional)
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: conciliado con prellenado TRIBU-CR" style={{ display: "block", marginTop: 4, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", width: "100%", boxSizing: "border-box" }} />
            </label>
            <button onClick={generar} disabled={generando} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 700 }}>
              {generando ? "Generando…" : "Generar liquidación"}
            </button>
            <button onClick={descargarXml} style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 8, padding: "0.6rem 1rem", cursor: "pointer", fontWeight: 600 }} title="Borrador XML del D-150 (sin firmar)">
              ⬇️ XML (borrador)
            </button>
          </div>
        </div>
      )}

      {/* Notas de crédito / débito */}
      <div style={card}>
        <strong style={{ fontSize: "1rem", color: "#0a2540" }}>Notas de crédito / débito</strong>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0.75rem" }}>Devoluciones, descuentos o cargos posteriores que ajustan el IVA del período (crédito resta, débito suma).</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.6rem", alignItems: "end" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>Tipo
            <select value={nota.tipo} onChange={(e) => setNota({ ...nota, tipo: e.target.value })} style={notaInp}><option value="Credito">Crédito (resta)</option><option value="Debito">Débito (suma)</option></select>
          </label>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>Naturaleza
            <select value={nota.naturaleza} onChange={(e) => setNota({ ...nota, naturaleza: e.target.value })} style={notaInp}><option value="Venta">Venta</option><option value="Compra">Compra</option></select>
          </label>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>Tarifa
            <select value={nota.iva_tarifa} onChange={(e) => setNota({ ...nota, iva_tarifa: e.target.value })} style={notaInp}>{["T13", "T04", "T02", "T01", "T005", "Exento"].map((t) => <option key={t} value={t}>{TARIFA_LABEL[t] ?? t}</option>)}</select>
          </label>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>Base (₡)
            <input type="number" value={nota.base} onChange={(e) => setNota({ ...nota, base: e.target.value })} style={notaInp} />
          </label>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>IVA (auto)
            <input type="number" value={nota.iva} onChange={(e) => setNota({ ...nota, iva: e.target.value })} placeholder="auto" style={notaInp} />
          </label>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>Doc. ref
            <input value={nota.documento_ref} onChange={(e) => setNota({ ...nota, documento_ref: e.target.value })} placeholder="Factura/OC" style={notaInp} />
          </label>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", gridColumn: "span 2" }}>Motivo
            <input value={nota.motivo} onChange={(e) => setNota({ ...nota, motivo: e.target.value })} style={notaInp} />
          </label>
          <button onClick={crearNota} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700, height: 34 }}>Registrar nota</button>
        </div>
      </div>

      {/* Histórico */}
      <div style={card}>
        <strong style={{ fontSize: "1rem", color: "#0a2540" }}>Historial de liquidaciones</strong>
        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th}>Período</th><th style={th}>Estado</th>
                <th style={{ ...th, textAlign: "right" }}>Débito</th>
                <th style={{ ...th, textAlign: "right" }}>Crédito aplic.</th>
                <th style={{ ...th, textAlign: "right" }}>IVA a pagar</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.length === 0 && <tr><td style={td} colSpan={6}>Aún no hay liquidaciones generadas.</td></tr>}
              {liquidaciones.map((l) => {
                const badge = { Pendiente: ["#fef3c7", "#92400e"], Generada: ["#dbeafe", "#1d4ed8"], Presentada: ["#e0e7ff", "#3730a3"], Pagada: ["#dcfce7", "#15803d"] }[l.estado as string] ?? ["#f1f5f9", "#475569"];
                return (
                  <tr key={l.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td}>{l.periodo}</td>
                    <td style={td}><span style={{ fontSize: "0.72rem", fontWeight: 700, background: badge[0], color: badge[1], borderRadius: 20, padding: "2px 10px" }}>{l.estado}</span></td>
                    <td style={{ ...td, textAlign: "right" }}>{CRC(l.debito_fiscal)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{CRC(l.credito_fiscal_aplicable)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: Number(l.iva_a_pagar) > 0 ? "#dc2626" : "#059669" }}>{CRC(l.iva_a_pagar)}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {l.estado === "Generada" && <button onClick={() => marcar(l.id, "presentada")} style={{ border: "1px solid #c7d2fe", background: "#fff", color: "#3730a3", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem", marginRight: 4 }}>Presentada</button>}
                      {(l.estado === "Generada" || l.estado === "Presentada") && <button onClick={() => marcar(l.id, "pagada")} style={{ border: "1px solid #bbf7d0", background: "#fff", color: "#15803d", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem" }}>Pagada</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información de soporte */}
      <div style={{ ...card, background: "#f8fafc" }}>
        <strong style={{ fontSize: "0.95rem", color: "#0a2540" }}>ℹ️ Información de soporte</strong>
        <ul style={{ fontSize: "0.84rem", color: "#475569", lineHeight: 1.7, marginTop: "0.5rem" }}>
          <li><strong>Formulario:</strong> D-150 en TRIBU-CR (reemplazó al ATV/D-104 desde el 6 oct 2025). Se declara <strong>por tarifa</strong>, no por actividad.</li>
          <li><strong>Plazo:</strong> primeros 15 días naturales del mes siguiente. Declarar aunque sea en cero.</li>
          <li><strong>Cálculo:</strong> IVA a pagar = Débito fiscal (IVA ventas, cta 2200) − Crédito fiscal aplicable (IVA compras, cta 1210 × prorrata) − Retenciones soportadas.</li>
          <li><strong>Prorrata:</strong> si hay ventas exentas (EVs, Ley 9518), el crédito fiscal no es 100% deducible; se prorratea por ventas gravadas / ventas totales. Es el punto más sancionado.</li>
          <li><strong>Conciliación:</strong> TRIBU-CR precarga desde la factura electrónica v4.4; estos totales deben cuadrar con ese prellenado.</li>
          <li><strong>Pago:</strong> se hace en TRIBU-CR (IBAN/banco). Al marcar "Pagada", el sistema registra el asiento Debe 2210 / Haber Banco.</li>
        </ul>
      </div>
    </div>
  );
};
