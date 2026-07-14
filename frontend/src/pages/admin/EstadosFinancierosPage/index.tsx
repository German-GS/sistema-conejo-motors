import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "6px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#64748b", textAlign: "left" };
const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "6px 10px", color: "#334155", fontSize: "0.85rem" };
const tdR: React.CSSProperties = { ...td, textAlign: "right" };

type Tab = "estado-resultados" | "balance-general" | "flujo-caja";

const mesActual = () => new Date().toISOString().slice(0, 7);

const Delta = ({ actual, anterior }: { actual: number; anterior?: number }) => {
  if (anterior === undefined || anterior === null || anterior === "" as any) return <span style={{ color: "#94a3b8" }}>—</span>;
  const d = +(actual - anterior).toFixed(2);
  if (Math.abs(d) < 0.01) return <span style={{ color: "#94a3b8" }}>=</span>;
  const pos = d > 0;
  return <span style={{ color: pos ? "#059669" : "#dc2626", fontWeight: 600 }}>{pos ? "▲" : "▼"} {CRC(Math.abs(d))}</span>;
};

export const EstadosFinancierosPage = () => {
  const [periodo, setPeriodo] = useState(mesActual());
  const [tab, setTab] = useState<Tab>("estado-resultados");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!periodo) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/estados-financieros/${tab}?periodo=${periodo}&comparar=true`);
      setData(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "No se pudo cargar el estado financiero.");
      setData(null);
    } finally { setLoading(false); }
  }, [periodo, tab]);

  useEffect(() => { cargar(); }, [cargar]);

  const descargarExcel = async () => {
    try {
      const res = await apiClient.get(`/estados-financieros/excel?periodo=${periodo}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `Estados-Financieros-${periodo}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("No se pudo generar el Excel."); }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "estado-resultados", label: "Estado de Resultados" },
    { id: "balance-general", label: "Balance General" },
    { id: "flujo-caja", label: "Flujo de Caja" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0, color: "#0a2540" }}>📊 Estados Financieros</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem" }} />
          <button onClick={descargarExcel} style={{ background: "#059669", border: "none", color: "#fff", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700 }}>📥 Excel (3 estados)</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem",
              border: tab === t.id ? "none" : "1.5px solid #e2e8f0",
              background: tab === t.id ? "#024f7d" : "#fff", color: tab === t.id ? "#fff" : "#475569" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ padding: "1rem", color: "#64748b" }}>Cargando…</p>}

      {/* Se valida la FORMA de los datos, no solo el tab: al cambiar de pestaña, `data`
          conserva por un instante la forma anterior hasta que llega el nuevo fetch. */}
      {!loading && tab === "estado-resultados" && data?.actual?.ingresos && <EstadoResultados data={data} />}
      {!loading && tab === "balance-general" && data?.actual?.activo && <BalanceGeneral data={data} />}
      {!loading && tab === "flujo-caja" && data?.actual?.operacion && <FlujoCaja data={data} />}

      <div style={{ ...card, background: "#f8fafc" }}>
        <p style={{ fontSize: "0.82rem", color: "#475569", margin: 0, lineHeight: 1.6 }}>
          Los tres estados se calculan desde el motor contable (partida doble) con comparativo contra el mes anterior.
          El <strong>Estado de Resultados</strong> y el <strong>Flujo de Caja</strong> son del período; el <strong>Balance General</strong> es acumulado a la fecha de corte.
        </p>
      </div>
    </div>
  );
};

const Seccion = ({ titulo, filas, actual, anterior, totalLabel, total, totalPrev }: any) => (
  <>
    <tr><td style={{ ...td, fontWeight: 800, color: "#0a2540", paddingTop: 12 }} colSpan={4}>{titulo}</td></tr>
    {filas.length === 0 && <tr><td style={{ ...td, color: "#94a3b8" }} colSpan={4}>Sin movimientos.</td></tr>}
    {filas.map((f: any) => {
      const prev = anterior?.find((x: any) => x.codigo === f.codigo);
      return (
        <tr key={f.codigo} style={{ borderTop: "1px solid #f8fafc" }}>
          <td style={{ ...td, paddingLeft: 22 }}>{f.codigo} {f.nombre}</td>
          <td style={tdR}>{CRC(f.monto ?? f.saldo)}</td>
          <td style={tdR}>{prev ? CRC(prev.monto ?? prev.saldo) : "—"}</td>
          <td style={tdR}><Delta actual={f.monto ?? f.saldo} anterior={prev?.monto ?? prev?.saldo} /></td>
        </tr>
      );
    })}
    {totalLabel && (
      <tr style={{ borderTop: "2px solid #e2e8f0" }}>
        <td style={{ ...td, fontWeight: 800 }}>{totalLabel}</td>
        <td style={{ ...tdR, fontWeight: 800 }}>{CRC(total)}</td>
        <td style={tdR}>{totalPrev !== undefined ? CRC(totalPrev) : "—"}</td>
        <td style={tdR}><Delta actual={total} anterior={totalPrev} /></td>
      </tr>
    )}
  </>
);

const Tabla = ({ children }: { children: React.ReactNode }) => (
  <div style={card}>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
        <thead><tr><th style={th}>Cuenta</th><th style={thR}>Actual</th><th style={thR}>Mes anterior</th><th style={thR}>Δ</th></tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>
);

const EstadoResultados = ({ data }: any) => {
  const a = data.actual, p = data.anterior;
  return (
    <Tabla>
      <Seccion titulo="INGRESOS" filas={a.ingresos} anterior={p?.ingresos} totalLabel="Total Ingresos" total={a.totalIngresos} totalPrev={p?.totalIngresos} />
      <Seccion titulo="GASTOS" filas={a.gastos} anterior={p?.gastos} totalLabel="Total Gastos" total={a.totalGastos} totalPrev={p?.totalGastos} />
      <tr style={{ borderTop: "3px solid #0a2540" }}>
        <td style={{ ...td, fontWeight: 800, color: a.utilidadNeta >= 0 ? "#059669" : "#dc2626" }}>UTILIDAD NETA</td>
        <td style={{ ...tdR, fontWeight: 800, color: a.utilidadNeta >= 0 ? "#059669" : "#dc2626" }}>{CRC(a.utilidadNeta)}</td>
        <td style={tdR}>{p ? CRC(p.utilidadNeta) : "—"}</td>
        <td style={tdR}><Delta actual={a.utilidadNeta} anterior={p?.utilidadNeta} /></td>
      </tr>
    </Tabla>
  );
};

// Fila simple de dos columnas (concepto / monto) para balance clasificado y flujo.
const Fila = ({ label, monto, bold, indent, color, top }: any) => (
  <tr style={{ borderTop: top ? top : "1px solid #f8fafc" }}>
    <td style={{ ...td, paddingLeft: indent ?? 10, fontWeight: bold ? 800 : 400, color: color ?? (bold ? "#0a2540" : "#334155") }} colSpan={3}>{label}</td>
    <td style={{ ...tdR, fontWeight: bold ? 800 : 400, color: color ?? "#334155" }}>{monto === undefined ? "" : CRC(monto)}</td>
  </tr>
);

const Tabla2 = ({ children }: { children: React.ReactNode }) => (
  <div style={card}>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>
);

const BalanceGeneral = ({ data }: any) => {
  const a = data.actual;
  const cuenta = (arr: any[]) => arr.map((c: any) => <Fila key={c.codigo} label={`${c.codigo} ${c.nombre}`} monto={c.saldo} indent={30} />);
  return (
    <>
      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>
        Corte al {a.fechaCorte} · {a.equilibrado
          ? <span style={{ color: "#059669", fontWeight: 700 }}>✓ Cuadrado</span>
          : <span style={{ color: "#dc2626", fontWeight: 700 }}>⚠️ Descuadrado</span>}
      </p>
      <Tabla2>
        <Fila label="ACTIVOS" bold color="#024f7d" />
        <Fila label="Activo corriente" bold indent={18} />
        {cuenta(a.activo.corriente)}
        <Fila label="Total activo corriente" monto={a.activo.totalCorriente} bold indent={18} />
        <Fila label="Activo no corriente" bold indent={18} />
        {cuenta(a.activo.noCorriente)}
        <Fila label="Total activo no corriente" monto={a.activo.totalNoCorriente} bold indent={18} />
        <Fila label="TOTAL ACTIVOS" monto={a.activo.total} bold top="2px solid #0a2540" />

        <Fila label="PASIVOS" bold color="#024f7d" top="3px solid #e2e8f0" />
        <Fila label="Pasivo corriente" bold indent={18} />
        {cuenta(a.pasivo.corriente)}
        <Fila label="Total pasivo corriente" monto={a.pasivo.totalCorriente} bold indent={18} />
        <Fila label="Pasivo no corriente" bold indent={18} />
        {cuenta(a.pasivo.noCorriente)}
        <Fila label="Total pasivo no corriente" monto={a.pasivo.totalNoCorriente} bold indent={18} />
        <Fila label="TOTAL PASIVOS" monto={a.pasivo.total} bold top="2px solid #0a2540" />

        <Fila label="PATRIMONIO" bold color="#024f7d" top="3px solid #e2e8f0" />
        {a.patrimonio.map((c: any) => <Fila key={c.codigo} label={`${c.codigo} ${c.nombre}`} monto={c.saldo} indent={30} />)}
        <Fila label="Utilidad del ejercicio" monto={a.totales.utilidadEjercicio} indent={30} />
        <Fila label="TOTAL PATRIMONIO" monto={a.totales.patrimonio} bold top="2px solid #0a2540" />
      </Tabla2>

      {/* Verificación de la ecuación contable (Parte F) */}
      <div style={{ ...card, background: a.equilibrado ? "#f0fdf4" : "#fef2f2", border: `1px solid ${a.equilibrado ? "#bbf7d0" : "#fecaca"}` }}>
        <div style={{ fontWeight: 700, color: a.equilibrado ? "#15803d" : "#b91c1c", fontSize: "0.9rem" }}>
          {a.equilibrado ? "✓" : "⚠️"} Activo = Pasivo + Patrimonio
        </div>
        <div style={{ fontSize: "0.95rem", marginTop: 4, color: "#334155" }}>
          {CRC(a.totales.activos)} = {CRC(a.totales.pasivos)} + {CRC(a.totales.patrimonio)} = <strong>{CRC(a.totales.pasivoMasPatrimonio)}</strong>
        </div>
      </div>
    </>
  );
};

const FlujoCaja = ({ data }: any) => {
  const a = data.actual;
  const seccion = (titulo: string, s: any) => (
    <>
      <Fila label={titulo} bold color="#024f7d" top="3px solid #e2e8f0" />
      {s.items.map((it: any, i: number) => <Fila key={i} label={it.concepto} monto={it.monto} indent={26} />)}
      <Fila label={`Total ${titulo.toLowerCase()}`} monto={s.total} bold indent={10} top="1px solid #e2e8f0" />
    </>
  );
  return (
    <>
      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>Estado de Flujo de Efectivo — método indirecto.</p>
      <Tabla2>
        {seccion("Actividades de operación", a.operacion)}
        {seccion("Actividades de inversión", a.inversion)}
        {seccion("Actividades de financiamiento", a.financiamiento)}
        <Fila label="VARIACIÓN NETA DE EFECTIVO" monto={a.variacionNeta} bold color={a.variacionNeta >= 0 ? "#059669" : "#dc2626"} top="3px solid #0a2540" />
      </Tabla2>

      {/* Cuadre contra la variación directa de caja */}
      <div style={{ ...card, background: a.cuadra ? "#f0fdf4" : "#fef2f2", border: `1px solid ${a.cuadra ? "#bbf7d0" : "#fecaca"}` }}>
        <div style={{ fontWeight: 700, color: a.cuadra ? "#15803d" : "#b91c1c", fontSize: "0.9rem" }}>
          {a.cuadra ? "✓ Cuadra con la variación directa de caja" : "⚠️ No cuadra — hay partidas sin clasificar"}
        </div>
        <div style={{ fontSize: "0.85rem", marginTop: 4, color: "#334155" }}>
          3 secciones: <strong>{CRC(a.variacionNeta)}</strong> · Variación directa de caja: <strong>{CRC(a.variacionCajaDirecta)}</strong> · Diferencia: <strong>{CRC(a.diferencia)}</strong>
        </div>
      </div>
    </>
  );
};

export default EstadosFinancierosPage;
