import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import apiClient from "@/api/apiClient";
import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import styles from "./SalesDashboardPage.module.css";
import { LeadsFollowUpWidget } from "@/components/LeadsFollowUpWidget";
import { QuotesExpiringWidget } from "@/components/QuotesExpiringWidget";

interface SalesStats {
  totalVehicles: number;
  monthlySalesCount: number;
  monthlyRevenue: number;
  estimatedCommissions: number;
  pendingItemsCount: number;
  salesData: { month: string; vendidos: number }[];
}

interface AlertaVencimiento {
  id: number; cliente: string; vehiculo: string; fecha_expiracion: string; horasRestantes: number;
}
interface AlertasReserva {
  vencenHoy: number; vencenManana: number; lista: AlertaVencimiento[];
}

interface Conectado {
  id: number;
  nombre: string;
  rol: string;
  desde: string;
  estado: "trabajando" | "almuerzo";
}

const fmtCRC = (v: number) =>
  "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(v);

const AVATAR_COLORS = [
  "#024f7d","#0891b2","#059669","#7c3aed","#db2777","#d97706","#dc2626",
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
const initials = (name: string) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const SalesDashboardPage = () => {
  const navigate  = useNavigate();
  const [stats, setStats]           = useState<SalesStats | null>(null);
  const [conectados, setConectados] = useState<Conectado[]>([]);
  const [alertas, setAlertas]       = useState<AlertasReserva | null>(null);
  const [loading, setLoading]       = useState(true);
  const [userName, setUserName]     = useState("Vendedor");
  const [myId, setMyId]             = useState(0);

  // Obtener nombre e id del token
  useEffect(() => {
    try {
      const tok = localStorage.getItem("accessToken");
      if (tok) {
        const d = jwtDecode<{ nombre_completo?: string; sub?: number }>(tok);
        setUserName(d.nombre_completo || "Vendedor");
        setMyId(d.sub ?? 0);
      }
    } catch { /* silencioso */ }
  }, []);

  const fetchAll = useCallback(async () => {
    const [s, c, a] = await Promise.allSettled([
      apiClient.get("/vehicles/dashboard/sales-stats"),
      apiClient.get("/asistencia/conectados-hoy"),
      apiClient.get("/quotes/alertas/vencimiento"),
    ]);
    if (s.status === "fulfilled") setStats(s.value.data);
    if (c.status === "fulfilled") setConectados(Array.isArray(c.value.data) ? c.value.data : []);
    if (a.status === "fulfilled") setAlertas(a.value.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 120_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Cargando...</p>
      </div>
    );
  }

  const trabajando = conectados.filter((c) => c.estado === "trabajando");
  const almuerzo   = conectados.filter((c) => c.estado === "almuerzo");
  const yoConectado = conectados.find((c) => c.id === myId);

  const primerNombre = userName.split(" ")[0];
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "¡Buenos días" : hora < 19 ? "¡Buenas tardes" : "¡Buenas noches";

  return (
    <div className={styles.page}>

      {/* ── Bienvenida ─────────────────────────────────────────────────── */}
      <div className={styles.welcomeBar}>
        <div>
          <h1 className={styles.welcomeTitle}>{saludo}, {primerNombre}! 👋</h1>
          <p className={styles.welcomeSub}>
            {new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
            {yoConectado && (
              <span className={styles.connectedBadge}>🟢 Conectado desde {yoConectado.desde}</span>
            )}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchAll} title="Actualizar">↻</button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className={styles.kpiRow}>
        <KpiCard icon="🚗" label="Disponibles" value={String(stats?.totalVehicles ?? 0)}
          sub="en catálogo" color="#024f7d" onClick={() => navigate("/sales/catalog")} />
        <KpiCard icon="✅" label="Mis Ventas" value={String(stats?.monthlySalesCount ?? 0)}
          sub="este mes" color="#059669" onClick={() => navigate("/sales/quotes")} />
        <KpiCard icon="💰" label="Ingresos Generados" value={fmtCRC(stats?.monthlyRevenue ?? 0)}
          sub="este mes" color="#0891b2" />
        <KpiCard icon="🎯" label="Comisiones Est." value={fmtCRC(stats?.estimatedCommissions ?? 0)}
          sub="estimado del mes" color="#7c3aed" />
        <KpiCard icon="📄" label="Pendientes" value={String(stats?.pendingItemsCount ?? 0)}
          sub="cotizaciones + leads" color={stats?.pendingItemsCount ? "#d97706" : "#64748b"}
          onClick={() => navigate("/sales/quotes")} />
      </div>

      {/* ── Grid: Equipo + Gráfico ──────────────────────────────────────── */}
      <div className={styles.mainGrid}>

        {/* Panel equipo online */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>👥 Equipo en Línea</span>
            <span className={styles.onlineDot} />
            <span className={styles.onlineCount}>{conectados.length} activos</span>
          </div>
          {conectados.length === 0 ? (
            <div className={styles.emptyPanel}>
              <span>😴</span>
              <p>Nadie ha marcado entrada hoy.</p>
            </div>
          ) : (
            <div className={styles.avatarList}>
              {trabajando.map((c) => (
                <div key={c.id} className={styles.avatarRow}>
                  <div
                    className={styles.avatar}
                    style={{
                      background: avatarColor(c.nombre),
                      outline: c.id === myId ? "2.5px solid #10b981" : "none",
                    }}
                  >
                    {initials(c.nombre)}
                  </div>
                  <div className={styles.avatarInfo}>
                    <span className={styles.avatarName}>
                      {c.nombre}
                      {c.id === myId && <span className={styles.youBadge}>Tú</span>}
                    </span>
                    <span className={styles.avatarSub}>
                      <span className={`${styles.rolChip} ${c.rol === "Administrador" ? styles.rolAdmin : styles.rolVendedor}`}>
                        {c.rol}
                      </span>
                      · desde {c.desde}
                    </span>
                  </div>
                  <span className={styles.statusDot} style={{ background: "#10b981" }} />
                </div>
              ))}
              {almuerzo.map((c) => (
                <div key={c.id} className={`${styles.avatarRow} ${styles.avatarMuted}`}>
                  <div className={styles.avatar} style={{ background: avatarColor(c.nombre) }}>
                    {initials(c.nombre)}
                  </div>
                  <div className={styles.avatarInfo}>
                    <span className={styles.avatarName}>{c.nombre}</span>
                    <span className={styles.avatarSub}>🍽️ Almuerzo</span>
                  </div>
                  <span className={styles.statusDot} style={{ background: "#f59e0b" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>📈 Mis Ventas Últimos 6 Meses</span>
          </div>
          <div style={{ padding: "1rem 0.5rem 0.5rem" }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats?.salesData ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, "Vendidos"]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="vendidos" fill="#024f7d" name="Vehículos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Leads con semáforo ──────────────────────────────────────────── */}
      <div style={{ marginBottom: "0" }}>
        <LeadsFollowUpWidget basePath="/sales" showVendedor={false} />
      </div>

      {/* ── Cotizaciones por vencer ─────────────────────────────────────── */}
      <QuotesExpiringWidget basePath="/admin" data={alertas} />

      {/* ── Accesos rápidos ─────────────────────────────────────────────── */}
      <div className={styles.quickLinks}>
        {[
          { icon: "📋", label: "Mis Cotizaciones",  path: "/sales/quotes" },
          { icon: "👥", label: "Mis Leads",          path: "/sales/leads" },
          { icon: "🚗", label: "Catálogo",           path: "/sales/catalog" },
          { icon: "📆", label: "Mi Asistencia",      path: "/sales/asistencia" },
          { icon: "📩", label: "Mis Solicitudes",    path: "/sales/solicitudes" },
        ].map((l) => (
          <button key={l.path} className={styles.quickLink} onClick={() => navigate(l.path)}>
            <span className={styles.quickIcon}>{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── KPI sub-componente ────────────────────────────────────────────────────────
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
    <span className={styles.kpiIcon}>{icon}</span>
    <div className={styles.kpiRight}>
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiLabel}>{label}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  </div>
);
