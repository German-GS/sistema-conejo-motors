import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";
import styles from "./ElectromovilidadSection.module.css";
import {
  LuZap,
  LuCalendarDays,
  LuFuel,
  LuBatteryCharging,
  LuChartColumnStacked,
  LuWallet,
  LuWrench,
  LuTrendingUp,
  LuBan,
  LuClipboardList,
} from "react-icons/lu";

// ── Datos basados en el estudio real de Conejo Motors ──────────────────

const costosAnuales = [
  { año: "Año 1", Gasolina: 416667, Eléctrico: 62000 },
  { año: "Año 2", Gasolina: 416667, Eléctrico: 62000 },
  { año: "Año 3", Gasolina: 416667, Eléctrico: 62000 },
];

const acumulado = [
  { mes: "Mes 3",  Gas: 104167,  Elec: 15500 },
  { mes: "Mes 6",  Gas: 208334,  Elec: 31000 },
  { mes: "Mes 9",  Gas: 312500,  Elec: 46500 },
  { mes: "Mes 12", Gas: 416667,  Elec: 62000 },
  { mes: "Mes 18", Gas: 625001,  Elec: 93000 },
  { mes: "Mes 24", Gas: 833335,  Elec: 124000 },
  { mes: "Mes 30", Gas: 1041669, Elec: 155000 },
  { mes: "Mes 36", Gas: 1250000, Elec: 186000 },
];

const mantenimientoData = [
  { concepto: "Cambios de aceite", Gas: 180000, Elec: 0 },
  { concepto: "Filtros", Gas: 37000, Elec: 21000 },
  { concepto: "Frenos / líquidos", Gas: 25000, Elec: 10000 },
  { concepto: "RITEVE + misc", Gas: 43000, Elec: 31000 },
  { concepto: "Llantas", Gas: 0, Elec: 16000 },
];

const costoPorKm = [
  { name: "Gasolina", value: 78.9, color: "#f97316" },
  { name: "Eléctrico", value: 11.7, color: "#00c7b1" },
];

const STATS = [
  { icon: <LuZap />, label: "Ahorro en 3 años", value: "₡1,064,000", sub: "≈ $1,900 USD", color: "#024f7d" },
  { icon: <LuCalendarDays />, label: "Ahorro mensual", value: "₡29,556", sub: "≈ $53 USD / mes", color: "#024f7d" },
  { icon: <LuFuel />, label: "Costo/km gasolina", value: "₡78.9", sub: "ciudad 12 km/L", color: "#f97316" },
  { icon: <LuBatteryCharging />, label: "Costo/km eléctrico", value: "₡11.7", sub: "6.7× más barato", color: "#00c7b1" },
];

const CRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

const CustomTooltipCRC = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {CRC(p.value)}
        </p>
      ))}
    </div>
  );
};

export const ElectromovilidadSection = () => {
  const [activeTab, setActiveTab] = useState<"costos" | "mantenimiento" | "acumulado">("costos");

  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.pill} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuChartColumnStacked size={16} /> Electromovilidad en Costa Rica</span>
          <h2>¿Cuánto ahorras con un eléctrico?</h2>
          <p className={styles.lead}>
            Basado en un uso real de <strong>15 km/día en ciudad</strong> + 3 viajes largos al año.
            Gasolina regular a <strong>₡748/L</strong> · Electricidad a <strong>₡65/kWh</strong> (nocturno).
          </p>
        </div>

        {/* Stats cards */}
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statIcon}>{s.icon}</span>
              <p className={styles.statValue} style={{ color: s.color }}>{s.value}</p>
              <p className={styles.statLabel}>{s.label}</p>
              <p className={styles.statSub}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(["costos", "mantenimiento", "acumulado"] as const).map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "costos" && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuWallet size={16} /> Costo anual</span>}
              {tab === "mantenimiento" && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuWrench size={16} /> Mantenimiento</span>}
              {tab === "acumulado" && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuTrendingUp size={16} /> Ahorro acumulado</span>}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className={styles.chartCard}>
          {activeTab === "costos" && (
            <>
              <h3>Gasto anual — Combustible + Mantenimiento</h3>
              <p className={styles.chartSub}>Comparación por año durante 3 años de uso</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costosAnuales} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="año" tick={{ fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => `₡${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltipCRC />} />
                  <Legend />
                  <Bar dataKey="Gasolina" fill="#f97316" radius={[6,6,0,0]} />
                  <Bar dataKey="Eléctrico" fill="#00c7b1" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Cost per km */}
              <div className={styles.kmGrid}>
                {costoPorKm.map(c => (
                  <div key={c.name} className={styles.kmCard} style={{ borderColor: c.color }}>
                    <p className={styles.kmValue} style={{ color: c.color }}>₡{c.value}</p>
                    <p className={styles.kmLabel}>Costo/km {c.name}</p>
                  </div>
                ))}
                <div className={styles.kmCard} style={{ borderColor: "#024f7d", background: "#e0f2fe" }}>
                  <p className={styles.kmValue} style={{ color: "#024f7d" }}>6.7×</p>
                  <p className={styles.kmLabel}>El eléctrico es más barato</p>
                </div>
              </div>
            </>
          )}

          {activeTab === "mantenimiento" && (
            <>
              <h3>Comparación de mantenimiento — 3 años</h3>
              <p className={styles.chartSub}>El eléctrico elimina cambios de aceite y reduce desgaste de frenos</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mantenimientoData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `₡${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b" }} />
                  <YAxis type="category" dataKey="concepto" width={140} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltipCRC />} />
                  <Legend />
                  <Bar dataKey="Gas" name="Gasolina" fill="#f97316" radius={[0,4,4,0]} />
                  <Bar dataKey="Elec" name="Eléctrico" fill="#00c7b1" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className={styles.maintNote}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuBan size={14} /> El eléctrico NO necesita:</strong> cambios de aceite · bujías · correa de distribución · filtro de aceite
              </div>
            </>
          )}

          {activeTab === "acumulado" && (
            <>
              <h3>Ahorro acumulado trimestral — 36 meses</h3>
              <p className={styles.chartSub}>La brecha crece con cada mes que pasa</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={acumulado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₡${(v/1000).toFixed(0)}k`} tick={{ fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltipCRC />} />
                  <Legend />
                  <Line type="monotone" dataKey="Gas" name="Gasolina" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Elec" name="Eléctrico" stroke="#00c7b1" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className={styles.savingHighlight}>
                <span>Ahorro total en 36 meses:</span>
                <strong>₡1,064,000 ≈ $1,900 USD</strong>
              </div>
            </>
          )}
        </div>

        {/* Supuestos */}
        <div className={styles.assumptions}>
          <p><strong style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuClipboardList size={14} /> Supuestos del cálculo:</strong></p>
          <ul>
            <li>Gasolina regular ₡748/L · ciudad 12 km/L · carretera 15 km/L</li>
            <li>Electricidad ₡65.07/kWh nocturno (ciudad) · ₡89.19/kWh valle (viajes)</li>
            <li>Uso: 15 km/día en ciudad + 3 viajes de 200 km al año</li>
            <li>BYD Seagull ~405 km autonomía CLTC · sin paradas en cargador público</li>
            <li>No incluye marchamo ni seguro INS · ₡560 por $1 USD</li>
          </ul>
        </div>

      </div>
    </section>
  );
};
