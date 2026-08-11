import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuBookOpen, LuDownload, LuCircleCheck, LuTriangleAlert } from "react-icons/lu";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);
const card: React.CSSProperties = { background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "6px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--slate-500)", textAlign: "left" };
const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "6px 10px", color: "var(--slate-700)", fontSize: "0.82rem" };
const tdR: React.CSSProperties = { ...td, textAlign: "right" };
const inp: React.CSSProperties = { padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.9rem", fontFamily: "inherit" };
const btnGreen: React.CSSProperties = { background: "var(--success)", border: "none", color: "#fff", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700 };

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => hoy().slice(0, 8) + "01";

async function descargar(url: string, filename: string) {
  const tId = toast.loading("Generando Excel…");
  try {
    const res = await apiClient.get(url, { responseType: "blob" });
    const u = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = u; a.download = filename; a.click();
    URL.revokeObjectURL(u);
    toast.dismiss(tId);
  } catch { toast.error("No se pudo generar el Excel.", { id: tId }); }
}

type Tab = "balanza" | "mayor" | "diario" | "aging";

export const ReportesContablesPage = () => {
  const [tab, setTab] = useState<Tab>("balanza");
  const TABS: { id: Tab; label: string }[] = [
    { id: "balanza", label: "Balanza de comprobación" },
    { id: "mayor", label: "Libro Mayor" },
    { id: "diario", label: "Libro Diario" },
    { id: "aging", label: "Antigüedad (CxC/CxP)" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ margin: 0, color: "var(--brand-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}><LuBookOpen size={22} /> Reportes Contables</h1>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
              border: tab === t.id ? "none" : "1.5px solid var(--slate-200)", background: tab === t.id ? "var(--brand)" : "#fff", color: tab === t.id ? "#fff" : "var(--slate-600)" }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "balanza" && <Balanza />}
      {tab === "mayor" && <Mayor />}
      {tab === "diario" && <Diario />}
      {tab === "aging" && <Aging />}
    </div>
  );
};

const Balanza = () => {
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<any>(null);
  const cargar = useCallback(async () => {
    try { setData((await apiClient.get(`/reportes-contables/balanza?hasta=${hasta}`)).data); }
    catch { toast.error("Error al cargar la balanza."); }
  }, [hasta]);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--slate-600)" }}>Al</label>
        <input type="date" style={inp} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <button style={{ ...btnGreen, display: "inline-flex", alignItems: "center", gap: "0.4rem" }} onClick={() => descargar(`/reportes-contables/balanza/excel?hasta=${hasta}`, `Balanza-${hasta}.xlsx`)}><LuDownload size={16} /> Excel</button>
        {data && <span style={{ marginLeft: "auto", fontWeight: 700, color: data.cuadra ? "var(--success)" : "var(--danger)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>{data.cuadra ? <><LuCircleCheck size={15} /> Cuadra</> : <><LuTriangleAlert size={15} /> No cuadra</>}</span>}
      </div>
      {data && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><th style={th}>Código</th><th style={th}>Cuenta</th><th style={thR}>Débitos</th><th style={thR}>Créditos</th><th style={thR}>Deudor</th><th style={thR}>Acreedor</th></tr></thead>
            <tbody>
              {data.cuentas.map((c: any) => (
                <tr key={c.codigo} style={{ borderTop: "1px solid var(--slate-100)" }}>
                  <td style={td}>{c.codigo}</td><td style={td}>{c.nombre}</td>
                  <td style={tdR}>{CRC(c.debe)}</td><td style={tdR}>{CRC(c.haber)}</td>
                  <td style={tdR}>{c.saldoDeudor ? CRC(c.saldoDeudor) : "—"}</td>
                  <td style={tdR}>{c.saldoAcreedor ? CRC(c.saldoAcreedor) : "—"}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--brand-dark)", fontWeight: 800 }}>
                <td style={td} colSpan={2}>TOTALES</td>
                <td style={tdR}>{CRC(data.totales.debe)}</td><td style={tdR}>{CRC(data.totales.haber)}</td>
                <td style={tdR}>{CRC(data.totales.saldoDeudor)}</td><td style={tdR}>{CRC(data.totales.saldoAcreedor)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Mayor = () => {
  const [codigo, setCodigo] = useState("1110");
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [data, setData] = useState<any>(null);
  const cargar = async () => {
    try { setData((await apiClient.get(`/reportes-contables/mayor?codigo=${codigo}&desde=${desde}&hasta=${hasta}`)).data); }
    catch (e: any) { toast.error(e.response?.data?.message || "Error al cargar el mayor."); }
  };
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input style={{ ...inp, width: 100 }} placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <input type="date" style={inp} value={desde} onChange={(e) => setDesde(e.target.value)} />
        <input type="date" style={inp} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <button style={{ background: "var(--brand)", border: "none", color: "#fff", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700 }} onClick={cargar}>Ver</button>
        <button style={{ ...btnGreen, display: "inline-flex", alignItems: "center", gap: "0.4rem" }} onClick={() => descargar(`/reportes-contables/mayor/excel?codigo=${codigo}&desde=${desde}&hasta=${hasta}`, `Mayor-${codigo}.xlsx`)}><LuDownload size={16} /> Excel</button>
      </div>
      {data && (
        <>
          <div style={{ fontWeight: 700, color: "var(--brand-dark)", marginBottom: "0.5rem" }}>{data.cuenta.codigo} {data.cuenta.nombre} · Saldo inicial: {CRC(data.saldoInicial)}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead><tr><th style={th}>Fecha</th><th style={th}>Asiento</th><th style={th}>Descripción</th><th style={thR}>Debe</th><th style={thR}>Haber</th><th style={thR}>Saldo</th></tr></thead>
              <tbody>
                {data.movimientos.map((m: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--slate-100)" }}>
                    <td style={td}>{m.fecha}</td><td style={td}>#{m.asiento}</td><td style={td}>{m.detalle || m.descripcion}</td>
                    <td style={tdR}>{m.debe ? CRC(m.debe) : "—"}</td><td style={tdR}>{m.haber ? CRC(m.haber) : "—"}</td>
                    <td style={tdR}>{CRC(m.saldo)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--brand-dark)", fontWeight: 800 }}><td style={td} colSpan={5}>SALDO FINAL</td><td style={tdR}>{CRC(data.saldoFinal)}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const Diario = () => {
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  return (
    <div style={card}>
      <p style={{ fontSize: "0.85rem", color: "var(--slate-500)", marginTop: 0 }}>Exportá el libro diario (todos los asientos con sus líneas) del rango seleccionado.</p>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" style={inp} value={desde} onChange={(e) => setDesde(e.target.value)} />
        <input type="date" style={inp} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <button style={{ ...btnGreen, display: "inline-flex", alignItems: "center", gap: "0.4rem" }} onClick={() => descargar(`/reportes-contables/diario/excel?desde=${desde}&hasta=${hasta}`, `Libro-Diario-${desde}_${hasta}.xlsx`)}><LuDownload size={16} /> Excel</button>
      </div>
    </div>
  );
};

const Aging = () => {
  const [tipo, setTipo] = useState<"cxc" | "cxp">("cxc");
  const [data, setData] = useState<any>(null);
  const cargar = useCallback(async () => {
    try { setData((await apiClient.get(`/reportes-contables/aging?tipo=${tipo}`)).data); }
    catch { toast.error("Error al cargar el aging."); }
  }, [tipo]);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select style={inp} value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
          <option value="cxc">Cuentas por Cobrar</option>
          <option value="cxp">Cuentas por Pagar</option>
        </select>
        <button style={{ ...btnGreen, display: "inline-flex", alignItems: "center", gap: "0.4rem" }} onClick={() => descargar(`/reportes-contables/aging/excel?tipo=${tipo}`, `Aging-${tipo}.xlsx`)}><LuDownload size={16} /> Excel</button>
      </div>
      {data && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr><th style={th}>{tipo === "cxc" ? "Cliente" : "Proveedor"}</th>{data.tramos.map((t: string) => <th key={t} style={thR}>{t}</th>)}<th style={thR}>Total</th></tr></thead>
            <tbody>
              {data.entidades.map((e: any, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid var(--slate-100)" }}>
                  <td style={td}>{e.entidad}</td>
                  {data.tramos.map((t: string) => <td key={t} style={tdR}>{e.tramos[t] ? CRC(e.tramos[t]) : "—"}</td>)}
                  <td style={{ ...tdR, fontWeight: 700 }}>{CRC(e.total)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--brand-dark)", fontWeight: 800 }}>
                <td style={td}>TOTALES</td>
                {data.tramos.map((t: string) => <td key={t} style={tdR}>{CRC(data.totales[t])}</td>)}
                <td style={tdR}>{CRC(data.totalGeneral)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportesContablesPage;
