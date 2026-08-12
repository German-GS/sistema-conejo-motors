import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card";
import { PageHeader, Table } from "@/components/ui";
import { LuWallet, LuDownload, LuUpload, LuChartColumnStacked, LuCalendarDays, LuTriangleAlert } from "react-icons/lu";

interface Resumen {
  saldoCajaBancos: number;
  porCobrar: number;
  porPagar: number;
  flujoProyectado: number;
  cuentas: {
    cxcAbiertas: number; cxpAbiertas: number;
    cxcVencidas: number; cxpVencidas: number;
    montoCxcVencidas: number; montoCxpVencidas: number;
  };
  proyeccion: {
    dias7: { cobrar: number; pagar: number; neto: number };
    dias30: { cobrar: number; pagar: number; neto: number };
  };
}

const CRC = (v: number) =>
  "₡" + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(v || 0);

const Kpi = ({ label, value, color, sub }: { label: React.ReactNode; value: string; color: string; sub?: string }) => (
  <div style={{ background: "#fff", border: "1px solid var(--slate-200)", borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "1rem 1.25rem", flex: "1 1 200px" }}>
    <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>{label}</div>
    <div style={{ fontSize: "1.5rem", fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.75rem", color: "var(--slate-400)", marginTop: 2 }}>{sub}</div>}
  </div>
);

export default function FinanzasPage() {
  const [r, setR] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/finanzas/resumen")
      .then((res) => setR(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Cargando resumen financiero...</p>;
  if (!r) return <p style={{ padding: "2rem" }}>No se pudo cargar el resumen.</p>;

  return (
    <div>
      <PageHeader
        title={<><LuWallet size={22} /> Resumen Financiero</>}
        subtitle="Posición de caja, cuentas por cobrar/pagar y flujo de caja proyectado."
      />

      {/* KPIs principales */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <Kpi label={<><LuWallet size={14} /> Caja y Bancos</>} value={CRC(r.saldoCajaBancos)} color="var(--brand)" />
        <Kpi label={<><LuDownload size={14} /> Por Cobrar (CxC)</>} value={CRC(r.porCobrar)} color="var(--success)"
          sub={`${r.cuentas.cxcAbiertas} cuenta(s)${r.cuentas.cxcVencidas > 0 ? ` · ⚠️ ${r.cuentas.cxcVencidas} vencidas` : ""}`} />
        <Kpi label={<><LuUpload size={14} /> Por Pagar (CxP)</>} value={CRC(r.porPagar)} color="var(--danger)"
          sub={`${r.cuentas.cxpAbiertas} cuenta(s)${r.cuentas.cxpVencidas > 0 ? ` · ⚠️ ${r.cuentas.cxpVencidas} vencidas` : ""}`} />
        <Kpi label={<><LuChartColumnStacked size={14} /> Flujo Proyectado</>} value={CRC(r.flujoProyectado)}
          color={r.flujoProyectado >= 0 ? "var(--success)" : "var(--danger)"}
          sub="Caja + por cobrar − por pagar" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Proyección de flujo */}
        <Card title={<><LuCalendarDays size={16} /> Flujo de caja proyectado</>}>
          <Table>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--slate-500)", borderBottom: "1px solid var(--slate-200)" }}>
                <th style={{ padding: "8px 6px" }}>Horizonte</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Por cobrar</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Por pagar</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Caja proyectada</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--slate-100)" }}>
                <td style={{ padding: "8px 6px" }}>Próximos 7 días</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--success)" }}>{CRC(r.proyeccion.dias7.cobrar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--danger)" }}>{CRC(r.proyeccion.dias7.pagar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: r.proyeccion.dias7.neto >= 0 ? "var(--success)" : "var(--danger)" }}>{CRC(r.proyeccion.dias7.neto)}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 6px" }}>Próximos 30 días</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--success)" }}>{CRC(r.proyeccion.dias30.cobrar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--danger)" }}>{CRC(r.proyeccion.dias30.pagar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: r.proyeccion.dias30.neto >= 0 ? "var(--success)" : "var(--danger)" }}>{CRC(r.proyeccion.dias30.neto)}</td>
              </tr>
            </tbody>
          </Table>
        </Card>

        {/* Vencidos */}
        <Card title={<><LuTriangleAlert size={16} /> Vencimientos</>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--slate-100)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><LuDownload size={14} /> CxC vencidas</span>
              <strong style={{ color: r.cuentas.cxcVencidas > 0 ? "var(--danger)" : "var(--success)" }}>
                {r.cuentas.cxcVencidas} · {CRC(r.cuentas.montoCxcVencidas)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><LuUpload size={14} /> CxP vencidas</span>
              <strong style={{ color: r.cuentas.cxpVencidas > 0 ? "var(--danger)" : "var(--success)" }}>
                {r.cuentas.cxpVencidas} · {CRC(r.cuentas.montoCxpVencidas)}
              </strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
