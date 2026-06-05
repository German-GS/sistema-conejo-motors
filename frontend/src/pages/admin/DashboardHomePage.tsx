import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/apiClient";
import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import styles from "./DashboardHomePage.module.css";
import { LeadsFollowUpWidget } from "../../components/LeadsFollowUpWidget";

// ─── tipos ────────────────────────────────────────────────────────────────────
interface BasicStats {
  totalVehicles: number;
  inventoryCost: number;
  monthlySales: number;
  monthlyRevenue: number;
  monthlyGrossProfit: number;
  salesData: { month: string; vendidos: number }[];
  salesBySellerData: { name: string; ventas: number }[];
}

interface ExtendedStats {
  inventario: { disponibles: number; reservados: number; vendidosMes: number; ingresosVehiculosMes: number };
  leads: { activos: number; cerradosMes: number; perdidosMes: number; hoy: number };
  cotizaciones: { activas: number; vencidas: number; mes: number };
  repuestos: { ventasMes: number; ingresosMes: number };
  topVendedores: { nombre: string; total: string; ingresos: string }[];
  salesData: { month: string; vehiculos: number; repuestos: number }[];
}

interface Conectado {
  id: number;
  nombre: string;
  rol: string;
  desde: string;
  estado: "trabajando" | "almuerzo";
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtCRC = (v: number) =>
  "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(v);

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const AVATAR_COLORS = [
  "#024f7d", "#0891b2", "#059669", "#7c3aed", "#db2777", "#d97706", "#dc2626",
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── componente ───────────────────────────────────────────────────────────────
export const DashboardHomePage = () => {
  const navigate = useNavigate();
  const [basic, setBasic]       = useState<BasicStats | null>(null);
  const [extended, setExtended] = useState<ExtendedStats | null>(null);
  const [conectados, setConectados] = useState<Conectado[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [b, e, c] = await Promise.all([
        apiClient.get("/vehicles/dashboard/stats"),
        apiClient.get("/vehicles/dashboard/extended"),
        apiClient.get("/asistencia/conectados-hoy"),
      ]);
      setBasic(b.data);
      setExtended(e.data);
      setConectados(Array.isArray(c.data) ? c.data : []);
      setLastUpdate(new Date());
    } catch {
      // silencioso — no rompe la UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Refresco automático cada 2 min para "conectados"
    const interval = setInterval(fetchAll, 120_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const conectadosTrabajando = conectados.filter((c) => c.estado === "trabajando");
  const conectadosAlmuerzo   = conectados.filter((c) => c.estado === "almuerzo");

  return (
    <div className={styles.page}>

      {/* ── Bienvenida ────────────────────────────────────────────────────── */}
      <div className={styles.welcomeBar}>
        <div>
          <h1 className={styles.welcomeTitle}>Panel de Control</h1>
          <p className={styles.welcomeSub}>
            {new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className={styles.refreshArea}>
          <span className={styles.lastUpdate}>
            Actualizado {lastUpdate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button className={styles.refreshBtn} onClick={fetchAll} title="Actualizar ahora">
            ↻
          </button>
        </div>
      </div>

      {/* ── KPIs fila 1 — inventario + ventas ────────────────────────────── */}
      <div className={styles.kpiRow}>
        <KpiCard
          icon="🚗"
          label="Disponibles"
          value={String(extended?.inventario.disponibles ?? basic?.totalVehicles ?? 0)}
          sub="en stock"
          color="#024f7d"
          onClick={() => navigate("/admin/inventory")}
        />
        <KpiCard
          icon="🔖"
          label="Reservados"
          value={String(extended?.inventario.reservados ?? 0)}
          sub="con cotización activa"
          color="#7c3aed"
          onClick={() => navigate("/admin/inventory")}
        />
        <KpiCard
          icon="✅"
          label="Vendidos"
          value={String(extended?.inventario.vendidosMes ?? basic?.monthlySales ?? 0)}
          sub="este mes"
          color="#059669"
          onClick={() => navigate("/admin/billing")}
        />
        <KpiCard
          icon="💰"
          label="Ingresos del Mes"
          value={fmtCRC(basic?.monthlyRevenue ?? 0)}
          sub={`Ganancia: ${fmtCRC(basic?.monthlyGrossProfit ?? 0)}`}
          color="#0891b2"
        />
      </div>

      {/* ── KPIs fila 2 — leads + repuestos + conectados ───────────────── */}
      <div className={styles.kpiRow}>
        <KpiCard
          icon="👥"
          label="Leads Activos"
          value={String(extended?.leads.activos ?? 0)}
          sub={`+${extended?.leads.hoy ?? 0} hoy · ${extended?.leads.cerradosMes ?? 0} cerrados este mes`}
          color="#d97706"
          onClick={() => navigate("/admin/leads")}
        />
        <KpiCard
          icon="📄"
          label="Cotizaciones Activas"
          value={String(extended?.cotizaciones.activas ?? 0)}
          sub={
            (extended?.cotizaciones.vencidas ?? 0) > 0
              ? `⚠️ ${extended!.cotizaciones.vencidas} vencidas · ${extended?.cotizaciones.mes ?? 0} este mes`
              : `${extended?.cotizaciones.mes ?? 0} creadas este mes`
          }
          color={(extended?.cotizaciones.vencidas ?? 0) > 0 ? "#dc2626" : "#024f7d"}
          onClick={() => navigate("/admin/sales/quotes")}
        />
        <KpiCard
          icon="🔧"
          label="Repuestos (Mes)"
          value={String(extended?.repuestos.ventasMes ?? 0)}
          sub={`${fmtCRC(extended?.repuestos.ingresosMes ?? 0)} en ventas`}
          color="#0891b2"
          onClick={() => navigate("/admin/productos")}
        />
        <KpiCard
          icon={conectadosAlmuerzo.length > 0 ? "🍽️" : "🟢"}
          label="Equipo Activo"
          value={String(conectados.length)}
          sub={
            conectados.length === 0
              ? "nadie ha marcado entrada"
              : conectadosAlmuerzo.length > 0
              ? `${conectadosTrabajando.length} trabajando · ${conectadosAlmuerzo.length} en almuerzo`
              : `${conectados.length} trabajando ahora`
          }
          color="#10b981"
        />
      </div>

      {/* ── Fila inferior: Conectados + Top Vendedores + Gráfico ─────────── */}
      <div className={styles.bottomGrid}>

        {/* Panel: Quién está conectado */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>👥 Equipo en Línea</span>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginLeft: "auto" }}>
              {conectadosTrabajando.length > 0 && (
                <span className={styles.teamChip} style={{ background: "#dcfce7", color: "#166534" }}>
                  ● {conectadosTrabajando.length} trabajando
                </span>
              )}
              {conectadosAlmuerzo.length > 0 && (
                <span className={styles.teamChip} style={{ background: "#fef3c7", color: "#92400e" }}>
                  🍽 {conectadosAlmuerzo.length} almuerzo
                </span>
              )}
            </div>
          </div>
          {conectados.length === 0 ? (
            <div className={styles.emptyPanel}>
              <span>😴</span>
              <p>Nadie ha marcado entrada hoy.</p>
            </div>
          ) : (
            <div className={styles.avatarList}>
              {conectadosTrabajando.map((c) => (
                <div key={c.id} className={styles.avatarRow}>
                  <div className={styles.avatar} style={{ background: avatarColor(c.nombre) }}>
                    {initials(c.nombre)}
                  </div>
                  <div className={styles.avatarInfo}>
                    <span className={styles.avatarName}>{c.nombre}</span>
                    <span className={styles.avatarSub}>{c.rol} · desde {c.desde}</span>
                  </div>
                  <span className={styles.statusChipGreen}>● Trabajando</span>
                </div>
              ))}
              {conectadosAlmuerzo.map((c) => (
                <div key={c.id} className={`${styles.avatarRow} ${styles.avatarRowAlmuerzo}`}>
                  <div className={styles.avatar} style={{ background: "#f59e0b" }}>
                    {initials(c.nombre)}
                  </div>
                  <div className={styles.avatarInfo}>
                    <span className={styles.avatarName}>{c.nombre}</span>
                    <span className={styles.avatarSub}>{c.rol} · desde {c.desde}</span>
                  </div>
                  <span className={styles.statusChipAmber}>🍽 Almuerzo</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel: Top Vendedores */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>🏆 Top Vendedores (Mes)</span>
          </div>
          {!extended?.topVendedores?.length ? (
            <div className={styles.emptyPanel}>
              <span>📊</span>
              <p>Sin cierres este mes aún.</p>
            </div>
          ) : (
            <div className={styles.rankList}>
              {extended.topVendedores.map((v, i) => (
                <div key={v.nombre} className={styles.rankRow}>
                  <span className={styles.rank}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className={styles.rankInfo}>
                    <span className={styles.rankName}>{v.nombre || "Sin asignar"}</span>
                    <div className={styles.rankBar}>
                      <div
                        className={styles.rankBarFill}
                        style={{
                          width: `${Math.min(100, (Number(v.total) / (Number(extended.topVendedores[0]?.total) || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className={styles.rankIngresos}>{fmtCRC(Number(v.ingresos) || 0)}</span>
                  </div>
                  <span className={styles.rankCount}>{v.total} vta{Number(v.total) !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico de ventas históricas — vehículos + repuestos */}
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>📈 Ventas Últimos 6 Meses</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={extended?.salesData ?? basic?.salesData?.map((d: any) => ({ ...d, vehiculos: d.vendidos, repuestos: 0 })) ?? []}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="vehiculos" fill="#024f7d" name="Vehículos" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="repuestos" fill="#0891b2" name="Repuestos" radius={[4, 4, 0, 0]} stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Widget Leads semáforo ─────────────────────────────────────── */}
      <div style={{ marginTop: "1.25rem" }}>
        <LeadsFollowUpWidget basePath="/admin" showVendedor={true} />
      </div>

      {/* ── Gráfico ventas por vendedor ───────────────────────────────────── */}
      {(basic?.salesBySellerData?.length ?? 0) > 0 && (
        <div className={styles.panel} style={{ marginTop: "1.25rem" }}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>👤 Ventas por Vendedor (Mes Actual)</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={basic!.salesBySellerData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v, "Ventas"]} />
              <Bar dataKey="ventas" fill="#0891b2" name="Vendidos" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ─── sub-componente KPI ───────────────────────────────────────────────────────
const KpiCard = ({
  icon, label, value, sub, color, onClick,
}: {
  icon: string; label: string; value: string; sub?: string;
  color: string; onClick?: () => void;
}) => (
  <div
    className={`${styles.kpi} ${onClick ? styles.kpiClickable : ""}`}
    onClick={onClick}
    style={{ "--accent": color } as React.CSSProperties}
  >
    <div className={styles.kpiLeft}>
      <span className={styles.kpiIcon}>{icon}</span>
    </div>
    <div className={styles.kpiRight}>
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiLabel}>{label}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  </div>
);
