import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/apiClient";
import {
  LuCar, LuUsers, LuPackage, LuReceiptText, LuBanknote,
  LuChartColumnStacked, LuBookmark, LuCircleCheck, LuWallet, LuFileText,
  LuTriangleAlert, LuWrench, LuUtensils, LuCircle, LuMoon, LuTrophy,
  LuMedal, LuAward, LuTrendingUp, LuUser, LuTarget, LuRefreshCw,
} from "react-icons/lu";
import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import styles from "./DashboardHomePage.module.css";
import { LeadsFollowUpWidget } from "../../components/LeadsFollowUpWidget";
import { QuotesExpiringWidget } from "../../components/QuotesExpiringWidget";
import { CierreMesWidget } from "../../components/CierreMesWidget";
import { Skeleton, SkeletonCards } from "../../components/Skeleton";

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

interface AlertaVencimiento {
  id: number; cliente: string; vehiculo: string; fecha_expiracion: string; horasRestantes: number;
}
interface AlertasReserva {
  vencenHoy: number; vencenManana: number; lista: AlertaVencimiento[];
}

interface ExtendedStats {
  inventario: { disponibles: number; reservados: number; vendidosMes: number; ingresosVehiculosMes: number };
  leads: { activos: number; cerradosMes: number; perdidosMes: number; hoy: number };
  cotizaciones: { activas: number; vencidas: number; mes: number };
  repuestos: { ventasMes: number; ingresosMes: number };
  topVendedores: { nombre: string; total: string; ingresos: string }[];
  conversionVendedores: { nombre: string; cotizaciones: number; ventas: number; conversion: number }[];
  salesData: { month: string; vehiculos: number; repuestos: number }[];
}

interface Conectado {
  id: number;
  nombre: string;
  rol: string;
  puesto?: string;
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
  const [alertas, setAlertas]   = useState<AlertasReserva | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [b, e, c, a] = await Promise.allSettled([
        apiClient.get("/vehicles/dashboard/stats"),
        apiClient.get("/vehicles/dashboard/extended"),
        apiClient.get("/asistencia/conectados-hoy"),
        apiClient.get("/quotes/alertas/vencimiento"),
      ]);
      if (b.status === "fulfilled") setBasic(b.value.data);
      if (e.status === "fulfilled") setExtended(e.value.data);
      if (c.status === "fulfilled") setConectados(Array.isArray(c.value.data) ? c.value.data : []);
      if (a.status === "fulfilled") setAlertas(a.value.data);
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
      <div className={styles.page}>
        <div style={{ marginBottom: "1.25rem" }}>
          <Skeleton width={220} height={26} />
          <Skeleton width={300} height={14} style={{ marginTop: 8 }} />
        </div>
        <SkeletonCards count={8} height={70} />
        <div style={{ marginTop: "1.25rem" }}>
          <SkeletonCards count={2} height={180} />
        </div>
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
            <LuRefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <QuickAction icon={<LuCar size={18} />} label="Nueva cotización" onClick={() => navigate("/admin/sales/catalog")} primary />
        <QuickAction icon={<LuUsers size={18} />} label="Leads / CRM" onClick={() => navigate("/admin/leads")} />
        <QuickAction icon={<LuPackage size={18} />} label="Inventario" onClick={() => navigate("/admin/inventory")} />
        <QuickAction icon={<LuReceiptText size={18} />} label="Facturación" onClick={() => navigate("/admin/billing")} />
        <QuickAction icon={<LuBanknote size={18} />} label="Finanzas" onClick={() => navigate("/admin/finanzas")} />
      </div>

      {/* ── Layout principal: KPIs izquierda + Panels derecha ───────────── */}
      <div className={styles.mainGrid}>

        {/* ── Columna izquierda: todos los indicadores compactos ─────────── */}
        <div className={styles.leftCol}>

          {/* KPIs compactos */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuChartColumnStacked size={16} /> Indicadores del Mes</span>
            </div>
            <div className={styles.miniKpiGrid}>
              <MiniKpi icon={<LuCar size={18} />} label="Disponibles"   value={String(extended?.inventario.disponibles ?? basic?.totalVehicles ?? 0)} color="#024f7d" onClick={() => navigate("/admin/inventory")} />
              <MiniKpi icon={<LuBookmark size={18} />} label="Reservados"    value={String(extended?.inventario.reservados ?? 0)} color="#7c3aed" onClick={() => navigate("/admin/inventory")} />
              <MiniKpi icon={<LuCircleCheck size={18} />} label="Vendidos"      value={String(extended?.inventario.vendidosMes ?? basic?.monthlySales ?? 0)} color="#059669" onClick={() => navigate("/admin/billing")} />
              <MiniKpi icon={<LuWallet size={18} />} label="Ingresos"      value={fmtCRC(basic?.monthlyRevenue ?? 0)} sub={`Ganancia ${fmtCRC(basic?.monthlyGrossProfit ?? 0)}`} color="#0891b2" />
              <MiniKpi icon={<LuUsers size={18} />} label="Leads activos" value={String(extended?.leads.activos ?? 0)} sub={`+${extended?.leads.hoy ?? 0} hoy`} color="#d97706" onClick={() => navigate("/admin/leads")} />
              <MiniKpi
                icon={<LuFileText size={18} />} label="Cotizaciones"
                value={String(extended?.cotizaciones.activas ?? 0)}
                sub={(extended?.cotizaciones.vencidas ?? 0) > 0 ? `${extended!.cotizaciones.vencidas} vencidas` : `${extended?.cotizaciones.mes ?? 0} este mes`}
                subIcon={(extended?.cotizaciones.vencidas ?? 0) > 0 ? <LuTriangleAlert size={13} /> : undefined}
                color={(extended?.cotizaciones.vencidas ?? 0) > 0 ? "#dc2626" : "#024f7d"}
                onClick={() => navigate("/admin/sales/quotes")}
              />
              <MiniKpi icon={<LuWrench size={18} />} label="Repuestos"     value={String(extended?.repuestos.ventasMes ?? 0)} sub={fmtCRC(extended?.repuestos.ingresosMes ?? 0)} color="#0891b2" onClick={() => navigate("/admin/productos")} />
              <MiniKpi
                icon={conectadosAlmuerzo.length > 0 ? <LuUtensils size={18} /> : <LuCircle size={18} fill="currentColor" />}
                label="Equipo activo"
                value={String(conectados.length)}
                sub={conectadosAlmuerzo.length > 0 ? `${conectadosTrabajando.length} trab · ${conectadosAlmuerzo.length} alm` : "trabajando ahora"}
                color="#10b981"
              />
            </div>
          </div>

          {/* Equipo en Línea */}
          <div className={styles.panel} style={{ marginTop: "1rem" }}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuUsers size={16} /> Equipo en Línea</span>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginLeft: "auto" }}>
                {conectadosTrabajando.length > 0 && (
                  <span className={styles.teamChip} style={{ background: "#dcfce7", color: "#166534" }}>
                    ● {conectadosTrabajando.length} trabajando
                  </span>
                )}
                {conectadosAlmuerzo.length > 0 && (
                  <span className={styles.teamChip} style={{ background: "#fef3c7", color: "#92400e", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <LuUtensils size={13} /> {conectadosAlmuerzo.length} almuerzo
                  </span>
                )}
              </div>
            </div>
            {conectados.length === 0 ? (
              <div className={styles.emptyPanel}>
                <span><LuMoon size={20} /></span>
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
                      <span className={styles.avatarSub}>{c.puesto || c.rol} · desde {c.desde}</span>
                    </div>
                    <span className={styles.statusChipGreen}>● Trab.</span>
                  </div>
                ))}
                {conectadosAlmuerzo.map((c) => (
                  <div key={c.id} className={`${styles.avatarRow} ${styles.avatarRowAlmuerzo}`}>
                    <div className={styles.avatar} style={{ background: "#f59e0b" }}>
                      {initials(c.nombre)}
                    </div>
                    <div className={styles.avatarInfo}>
                      <span className={styles.avatarName}>{c.nombre}</span>
                      <span className={styles.avatarSub}>{c.puesto || c.rol} · desde {c.desde}</span>
                    </div>
                    <span className={styles.statusChipAmber} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><LuUtensils size={12} /> Alm.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Columna derecha: gráficos y rankings ───────────────────────── */}
        <div className={styles.rightCol}>

          {/* Top Vendedores + Gráfico 6 meses */}
          <div className={styles.rightTopRow}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuTrophy size={16} /> Top Vendedores (Mes)</span>
              </div>
              {!extended?.topVendedores?.length ? (
                <div className={styles.emptyPanel}>
                  <span><LuChartColumnStacked size={20} /></span>
                  <p>Sin cierres este mes aún.</p>
                </div>
              ) : (
                <div className={styles.rankList}>
                  {extended.topVendedores.map((v, i) => (
                    <div key={v.nombre} className={styles.rankRow}>
                      <span className={styles.rank}>
                        {i === 0 ? <LuTrophy size={16} /> : i === 1 ? <LuMedal size={16} /> : i === 2 ? <LuAward size={16} /> : `#${i + 1}`}
                      </span>
                      <div className={styles.rankInfo}>
                        <span className={styles.rankName}>{v.nombre || "Sin asignar"}</span>
                        <div className={styles.rankBar}>
                          <div className={styles.rankBarFill} style={{ width: `${Math.min(100, (Number(v.total) / (Number(extended.topVendedores[0]?.total) || 1)) * 100)}%` }} />
                        </div>
                        <span className={styles.rankIngresos}>{fmtCRC(Number(v.ingresos) || 0)}</span>
                      </div>
                      <span className={styles.rankCount}>{v.total} vta{Number(v.total) !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuTrendingUp size={16} /> Ventas Últimos 6 Meses</span>
              </div>
              <div style={{ padding: "0.75rem 0.5rem 0.5rem" }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={extended?.salesData ?? basic?.salesData?.map((d: any) => ({ ...d, vehiculos: d.vendidos, repuestos: 0 })) ?? []}
                    margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="vehiculos" fill="#024f7d" name="Vehículos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="repuestos" fill="#0891b2" name="Repuestos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Ventas por vendedor (mes) */}
          {(basic?.salesBySellerData?.length ?? 0) > 0 && (
            <div className={styles.panel} style={{ marginTop: "1rem" }}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuUser size={16} /> Ventas por Vendedor (Mes Actual)</span>
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

          {/* ── Cotizaciones activas ───────────────────────────────────── */}
          <div style={{ marginTop: "1rem" }}>
            <QuotesExpiringWidget basePath="/admin" data={alertas} />
          </div>

          {/* ── Conversión cotización → venta por vendedor ─────────────── */}
          <div className={styles.panel} style={{ marginTop: "1rem" }}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuTarget size={16} /> Conversión por Vendedor (Mes)</span>
            </div>
            {!extended?.conversionVendedores?.length ? (
              <div className={styles.emptyPanel}>
                <span><LuChartColumnStacked size={20} /></span>
                <p>Sin cotizaciones este mes aún.</p>
              </div>
            ) : (
              <div className={styles.rankList}>
                {extended.conversionVendedores.map((v) => (
                  <div key={v.nombre} className={styles.rankRow}>
                    <div className={styles.rankInfo}>
                      <span className={styles.rankName}>{v.nombre || "Sin asignar"}</span>
                      <div className={styles.rankBar}>
                        <div
                          className={styles.rankBarFill}
                          style={{
                            width: `${Math.min(100, v.conversion)}%`,
                            background: v.conversion >= 50 ? "#059669" : v.conversion >= 25 ? "#d97706" : "#dc2626",
                          }}
                        />
                      </div>
                      <span className={styles.rankIngresos}>{v.ventas} de {v.cotizaciones} cotizaciones</span>
                    </div>
                    <span className={styles.rankCount} style={{ fontWeight: 700 }}>{v.conversion}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Cierre de Mes ──────────────────────────────────────────── */}
          <div style={{ marginTop: "1rem" }}>
            <CierreMesWidget />
          </div>

          {/* ── Widget Leads semáforo ───────────────────────────────────── */}
          <div style={{ marginTop: "1rem" }}>
            <LeadsFollowUpWidget basePath="/admin" showVendedor={true} />
          </div>
        </div>
      </div>

    </div>
  );
};

// ─── sub-componente QuickAction (acceso rápido) ──────────────────────────────
const QuickAction = ({ icon, label, onClick, primary }: {
  icon: ReactNode; label: string; onClick: () => void; primary?: boolean;
}) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.6rem 1rem", borderRadius: 10, cursor: "pointer",
      fontSize: "0.9rem", fontWeight: 600,
      border: primary ? "none" : "1px solid #e2e8f0",
      background: primary ? "#024f7d" : "#fff",
      color: primary ? "#fff" : "#334155",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    }}
  >
    <span style={{ fontSize: "1.1rem", display: "inline-flex", alignItems: "center" }}>{icon}</span> {label}
  </button>
);

// ─── sub-componente MiniKpi (compact) ────────────────────────────────────────
const MiniKpi = ({
  icon, label, value, sub, subIcon, color, onClick,
}: {
  icon: ReactNode; label: string; value: string; sub?: string; subIcon?: ReactNode;
  color: string; onClick?: () => void;
}) => (
  <div
    className={`${styles.miniKpi} ${onClick ? styles.miniKpiClickable : ""}`}
    onClick={onClick}
    style={{ "--accent": color } as React.CSSProperties}
  >
    <span className={styles.miniKpiIcon}>{icon}</span>
    <span className={styles.miniKpiValue}>{value}</span>
    <span className={styles.miniKpiLabel}>{label}</span>
    {sub && <span className={styles.miniKpiSub} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>{subIcon} {sub}</span>}
  </div>
);
