import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuBookOpen, LuDownload, LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import { Button, PageHeader, Table, Tabs } from "@/components/ui";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);
const card: React.CSSProperties = { background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12, padding: "1.25rem" };
const thR: React.CSSProperties = { textAlign: "right" };
const tdR: React.CSSProperties = { textAlign: "right" };
const inp: React.CSSProperties = { padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.9rem", fontFamily: "inherit" };

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
      <PageHeader title={<><LuBookOpen size={22} /> Reportes Contables</>} />
      <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as Tab)} />
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
        <Button variant="secondary" icon={<LuDownload size={16} />} onClick={() => descargar(`/reportes-contables/balanza/excel?hasta=${hasta}`, `Balanza-${hasta}.xlsx`)}>Excel</Button>
        {data && <span style={{ marginLeft: "auto", fontWeight: 700, color: data.cuadra ? "var(--success)" : "var(--danger)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>{data.cuadra ? <><LuCircleCheck size={15} /> Cuadra</> : <><LuTriangleAlert size={15} /> No cuadra</>}</span>}
      </div>
      {data && (
        <Table>
            <thead><tr><th>Código</th><th>Cuenta</th><th style={thR}>Débitos</th><th style={thR}>Créditos</th><th style={thR}>Deudor</th><th style={thR}>Acreedor</th></tr></thead>
            <tbody>
              {data.cuentas.map((c: any) => (
                <tr key={c.codigo}>
                  <td>{c.codigo}</td><td>{c.nombre}</td>
                  <td style={tdR}>{CRC(c.debe)}</td><td style={tdR}>{CRC(c.haber)}</td>
                  <td style={tdR}>{c.saldoDeudor ? CRC(c.saldoDeudor) : "—"}</td>
                  <td style={tdR}>{c.saldoAcreedor ? CRC(c.saldoAcreedor) : "—"}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--brand-dark)", fontWeight: 800 }}>
                <td colSpan={2}>TOTALES</td>
                <td style={tdR}>{CRC(data.totales.debe)}</td><td style={tdR}>{CRC(data.totales.haber)}</td>
                <td style={tdR}>{CRC(data.totales.saldoDeudor)}</td><td style={tdR}>{CRC(data.totales.saldoAcreedor)}</td>
              </tr>
            </tbody>
        </Table>
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
        <Button variant="primary" onClick={cargar}>Ver</Button>
        <Button variant="secondary" icon={<LuDownload size={16} />} onClick={() => descargar(`/reportes-contables/mayor/excel?codigo=${codigo}&desde=${desde}&hasta=${hasta}`, `Mayor-${codigo}.xlsx`)}>Excel</Button>
      </div>
      {data && (
        <>
          <div style={{ fontWeight: 700, color: "var(--brand-dark)", marginBottom: "0.5rem" }}>{data.cuenta.codigo} {data.cuenta.nombre} · Saldo inicial: {CRC(data.saldoInicial)}</div>
          <Table>
              <thead><tr><th>Fecha</th><th>Asiento</th><th>Descripción</th><th style={thR}>Debe</th><th style={thR}>Haber</th><th style={thR}>Saldo</th></tr></thead>
              <tbody>
                {data.movimientos.map((m: any, i: number) => (
                  <tr key={i}>
                    <td>{m.fecha}</td><td>#{m.asiento}</td><td>{m.detalle || m.descripcion}</td>
                    <td style={tdR}>{m.debe ? CRC(m.debe) : "—"}</td><td style={tdR}>{m.haber ? CRC(m.haber) : "—"}</td>
                    <td style={tdR}>{CRC(m.saldo)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--brand-dark)", fontWeight: 800 }}><td colSpan={5}>SALDO FINAL</td><td style={tdR}>{CRC(data.saldoFinal)}</td></tr>
              </tbody>
          </Table>
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
        <Button variant="secondary" icon={<LuDownload size={16} />} onClick={() => descargar(`/reportes-contables/diario/excel?desde=${desde}&hasta=${hasta}`, `Libro-Diario-${desde}_${hasta}.xlsx`)}>Excel</Button>
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
        <Button variant="secondary" icon={<LuDownload size={16} />} onClick={() => descargar(`/reportes-contables/aging/excel?tipo=${tipo}`, `Aging-${tipo}.xlsx`)}>Excel</Button>
      </div>
      {data && (
        <Table>
            <thead><tr><th>{tipo === "cxc" ? "Cliente" : "Proveedor"}</th>{data.tramos.map((t: string) => <th key={t} style={thR}>{t}</th>)}<th style={thR}>Total</th></tr></thead>
            <tbody>
              {data.entidades.map((e: any, i: number) => (
                <tr key={i}>
                  <td>{e.entidad}</td>
                  {data.tramos.map((t: string) => <td key={t} style={tdR}>{e.tramos[t] ? CRC(e.tramos[t]) : "—"}</td>)}
                  <td style={{ ...tdR, fontWeight: 700 }}>{CRC(e.total)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--brand-dark)", fontWeight: 800 }}>
                <td>TOTALES</td>
                {data.tramos.map((t: string) => <td key={t} style={tdR}>{CRC(data.totales[t])}</td>)}
                <td style={tdR}>{CRC(data.totalGeneral)}</td>
              </tr>
            </tbody>
        </Table>
      )}
    </div>
  );
};

export default ReportesContablesPage;
