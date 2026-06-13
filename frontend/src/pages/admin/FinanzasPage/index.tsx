import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card";

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

const Kpi = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "1rem 1.25rem", flex: "1 1 200px" }}>
    <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: "1.5rem", fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
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
      <h1 style={{ marginBottom: "0.25rem" }}>Resumen Financiero</h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
        Posición de caja, cuentas por cobrar/pagar y flujo de caja proyectado.
      </p>

      {/* KPIs principales */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <Kpi label="💵 Caja y Bancos" value={CRC(r.saldoCajaBancos)} color="#024f7d" />
        <Kpi label="📥 Por Cobrar (CxC)" value={CRC(r.porCobrar)} color="#059669"
          sub={`${r.cuentas.cxcAbiertas} cuenta(s)${r.cuentas.cxcVencidas > 0 ? ` · ⚠️ ${r.cuentas.cxcVencidas} vencidas` : ""}`} />
        <Kpi label="📤 Por Pagar (CxP)" value={CRC(r.porPagar)} color="#dc2626"
          sub={`${r.cuentas.cxpAbiertas} cuenta(s)${r.cuentas.cxpVencidas > 0 ? ` · ⚠️ ${r.cuentas.cxpVencidas} vencidas` : ""}`} />
        <Kpi label="📊 Flujo Proyectado" value={CRC(r.flujoProyectado)}
          color={r.flujoProyectado >= 0 ? "#059669" : "#dc2626"}
          sub="Caja + por cobrar − por pagar" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Proyección de flujo */}
        <Card title="📅 Flujo de caja proyectado">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "8px 6px" }}>Horizonte</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Por cobrar</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Por pagar</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Caja proyectada</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 6px" }}>Próximos 7 días</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#059669" }}>{CRC(r.proyeccion.dias7.cobrar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#dc2626" }}>{CRC(r.proyeccion.dias7.pagar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: r.proyeccion.dias7.neto >= 0 ? "#059669" : "#dc2626" }}>{CRC(r.proyeccion.dias7.neto)}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 6px" }}>Próximos 30 días</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#059669" }}>{CRC(r.proyeccion.dias30.cobrar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#dc2626" }}>{CRC(r.proyeccion.dias30.pagar)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: r.proyeccion.dias30.neto >= 0 ? "#059669" : "#dc2626" }}>{CRC(r.proyeccion.dias30.neto)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* Vencidos */}
        <Card title="⚠️ Vencimientos">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f1f5f9" }}>
              <span>📥 CxC vencidas</span>
              <strong style={{ color: r.cuentas.cxcVencidas > 0 ? "#dc2626" : "#059669" }}>
                {r.cuentas.cxcVencidas} · {CRC(r.cuentas.montoCxcVencidas)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <span>📤 CxP vencidas</span>
              <strong style={{ color: r.cuentas.cxpVencidas > 0 ? "#dc2626" : "#059669" }}>
                {r.cuentas.cxpVencidas} · {CRC(r.cuentas.montoCxpVencidas)}
              </strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
