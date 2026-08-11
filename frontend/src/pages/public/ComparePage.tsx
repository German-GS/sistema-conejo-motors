import { getImageUrl } from "@/utils/imageUrl";
import { useState, useEffect, useRef } from "react";
import apiClient from "@/api/apiClient";
import { Modal } from "@/components/Modal";
import styles from "./ComparePage.module.css";
import stylesLayout from "@/components/PublicLayout/PublicLayout.module.css";
import { SeoHead } from "@/components/SeoHead";

// ── Interfaces ─────────────────────────────────────────────────────────────
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  color?: string;
  precio_venta: number;
  precio_venta_final?: number | null;
  autonomia_km: number;
  potencia_hp: number;
  capacidad_bateria_kwh: number;
  tiempo_carga_dc?: number;   // minutos (20%→80% DC)
  tiempo_carga_ac?: number;   // minutos (AC residencial)
  aceleracion_0_100?: number; // segundos
  velocidad_maxima?: number;  // km/h
  torque_nm?: number;
  imagenes?: { url: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

const PRECIO_KWH  = 60;    // ₡/kWh tarifa residencial ICE
const PRECIO_GAS  = 850;   // ₡/litro gasolina Super CR
const KM_POR_LITRO = 12;   // rendimiento promedio gasolina

// Estima ciudad (+8%) y autopista (-28%) desde el oficial WLTP
const rangCity    = (km: number) => Math.round(km * 0.88);
const rangHighway = (km: number) => Math.round(km * 0.72);

// Costo de carga completa en ₡
const costoCarga  = (kwh: number) => Math.round(kwh * PRECIO_KWH);
// Costo de "tanque" de gasolina para misma distancia
const costoGas    = (km: number) => Math.round((km / KM_POR_LITRO) * PRECIO_GAS);

// Ganador entre valores numéricos (higher = better por defecto, lower si inverse=true)
const isWinner = (vals: (number | undefined)[], idx: number, inverse = false): boolean => {
  const nums = vals.filter((v): v is number => v !== undefined && v > 0);
  if (nums.length < 2) return false;
  const best = inverse ? Math.min(...nums) : Math.max(...nums);
  return vals[idx] === best;
};

// ── Barra visual ───────────────────────────────────────────────────────────
const Bar = ({ value, max, color = "#00c7b1", label }: { value: number; max: number; color?: string; label: string }) => (
  <div className={styles.barWrap}>
    <span className={styles.barLabel}>{label}</span>
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
    <span className={styles.barValue}>{value.toLocaleString("es-CR")} km</span>
  </div>
);

const TimeBar = ({ value, max, color, label, unit = "min" }: { value: number; max: number; color: string; label: string; unit?: string }) => (
  <div className={styles.barWrap}>
    <span className={styles.barLabel}>{label}</span>
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
    <span className={styles.barValue}>{value} {unit}</span>
  </div>
);

// ── Sección de métrica de impacto ──────────────────────────────────────────
const ImpactMetrics = ({ vehicles }: { vehicles: (Vehicle | null)[] }) => {
  const active = vehicles.filter((v): v is Vehicle => v !== null);
  if (active.length < 1) return null;

  const maxRange = Math.max(...active.map(v => v.autonomia_km || 0)) * 1.1;
  const maxDC    = Math.max(...active.map(v => v.tiempo_carga_dc || 0)) * 1.1 || 60;
  const maxAC    = Math.max(...active.map(v => v.tiempo_carga_ac || 0)) * 1.1 || 600;

  const COLORS = ["var(--brand)", "#00c7b1", "var(--warning)"];

  return (
    <div className={styles.impactSection}>

      {/* ── Autonomía ── */}
      <div className={styles.impactBlock}>
        <div className={styles.impactHeader}>
          <span className={styles.impactIcon}>🗺️</span>
          <div>
            <h3>Autonomía Real Estimada</h3>
            <p>Basado en perfil de conducción mixto Costa Rica (WLTP oficial como referencia)</p>
          </div>
        </div>
        <div className={styles.impactCols}>
          {vehicles.map((v, i) => !v ? null : (
            <div key={i} className={styles.impactCol}>
              <div className={styles.impactColName} style={{ color: COLORS[i] }}>
                {v.marca} {v.modelo}
              </div>
              <Bar value={rangCity(v.autonomia_km)}    max={maxRange} color={COLORS[i]} label="🏙️ Ciudad" />
              <Bar value={rangHighway(v.autonomia_km)} max={maxRange} color={COLORS[i]} label="🛣️ Autopista" />
              <Bar value={v.autonomia_km}              max={maxRange} color={COLORS[i]} label="🔄 Mixto (WLTP)" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Carga ── */}
      {active.some(v => v.tiempo_carga_dc || v.tiempo_carga_ac) && (
        <div className={styles.impactBlock}>
          <div className={styles.impactHeader}>
            <span className={styles.impactIcon}>⚡</span>
            <div>
              <h3>Tiempo de Carga (20% → 80%)</h3>
              <p>Cargador residencial AC vs cargador rápido de corriente continua (DC)</p>
            </div>
          </div>
          <div className={styles.impactCols}>
            {vehicles.map((v, i) => !v ? null : (
              <div key={i} className={styles.impactCol}>
                <div className={styles.impactColName} style={{ color: COLORS[i] }}>
                  {v.marca} {v.modelo}
                </div>
                {v.tiempo_carga_ac ? (
                  <TimeBar value={v.tiempo_carga_ac} max={maxAC} color="var(--slate-400)" label="🏠 AC Residencial" unit="min" />
                ) : <p className={styles.noData}>Sin dato AC</p>}
                {v.tiempo_carga_dc ? (
                  <TimeBar value={v.tiempo_carga_dc} max={maxDC} color={COLORS[i]} label="🔌 DC Rápido" unit="min" />
                ) : <p className={styles.noData}>Sin dato DC</p>}
              </div>
            ))}
          </div>
          <p className={styles.impactNote}>
            * Tiempos pueden variar según temperatura, estado de batería y tipo de cargador instalado.
          </p>
        </div>
      )}

      {/* ── Costo por "tanque lleno" ── */}
      {active.some(v => v.capacidad_bateria_kwh && v.autonomia_km) && (
        <div className={styles.impactBlock}>
          <div className={styles.impactHeader}>
            <span className={styles.impactIcon}>💰</span>
            <div>
              <h3>Costo de Recarga Completa</h3>
              <p>Comparado con llenar el tanque de un auto a gasolina equivalente (₡{PRECIO_KWH}/kWh · ₡{PRECIO_GAS}/litro)</p>
            </div>
          </div>
          <div className={styles.costGrid}>
            {vehicles.map((v, i) => !v || !v.capacidad_bateria_kwh ? null : (
              <div key={i} className={styles.costCard}>
                <div className={styles.costCardHeader} style={{ borderColor: COLORS[i] }}>
                  <strong style={{ color: COLORS[i] }}>{v.marca} {v.modelo}</strong>
                  <span className={styles.kwhBadge}>{v.capacidad_bateria_kwh} kWh</span>
                </div>
                <div className={styles.costRow}>
                  <div className={styles.costItem + " " + styles.costElec}>
                    <span>⚡ Carga completa</span>
                    <strong>{fmtCRC(costoCarga(v.capacidad_bateria_kwh))}</strong>
                    <small>~{v.autonomia_km} km de autonomía</small>
                  </div>
                  <div className={styles.costVs}>vs</div>
                  <div className={styles.costItem + " " + styles.costGas}>
                    <span>⛽ Gasolina equivalente</span>
                    <strong>{fmtCRC(costoGas(v.autonomia_km))}</strong>
                    <small>{Math.round(v.autonomia_km / KM_POR_LITRO)} litros estimados</small>
                  </div>
                </div>
                <div className={styles.costSavings}>
                  Ahorro estimado: <strong>{fmtCRC(costoGas(v.autonomia_km) - costoCarga(v.capacidad_bateria_kwh))}</strong> por carga
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tabla comparativa con ganadores ───────────────────────────────────────
const sections: { label: string; rows: { key: string; label: string; fmt: (v: any) => string; inverse: boolean }[] }[] = [
  {
    label: "💲 Precio",
    rows: [
      { key: "precio_venta",          label: "Precio de lista",     fmt: (v: number) => fmtCRC(v),           inverse: true },
      { key: "precio_venta_final",     label: "Precio con descuento",fmt: (v: number) => v ? fmtCRC(v) : "—", inverse: true },
    ],
  },
  {
    label: "🔋 Batería y Carga",
    rows: [
      { key: "capacidad_bateria_kwh", label: "Capacidad batería (kWh)", fmt: (v: number) => v ? `${v} kWh` : "—",     inverse: false },
      { key: "autonomia_km",          label: "Autonomía WLTP (km)",     fmt: (v: number) => v ? `${v} km` : "—",      inverse: false },
      { key: "tiempo_carga_dc",       label: "Carga DC rápida (min)",   fmt: (v: number) => v ? `${v} min` : "—",     inverse: true },
      { key: "tiempo_carga_ac",       label: "Carga AC residencial",    fmt: (v: number) => v ? `${Math.round(v/60)}h ${v%60}min` : "—", inverse: true },
    ],
  },
  {
    label: "⚡ Rendimiento",
    rows: [
      { key: "potencia_hp",         label: "Potencia (HP)",       fmt: (v: number) => v ? `${v} HP` : "—",    inverse: false },
      { key: "torque_nm",           label: "Torque (Nm)",         fmt: (v: number) => v ? `${v} Nm` : "—",    inverse: false },
      { key: "aceleracion_0_100",   label: "0-100 km/h (seg)",    fmt: (v: number) => v ? `${v} s` : "—",     inverse: true },
      { key: "velocidad_maxima",    label: "Velocidad máxima",    fmt: (v: number) => v ? `${v} km/h` : "—",  inverse: false },
    ],
  },
  {
    label: "📋 General",
    rows: [
      { key: "año",   label: "Año del modelo", fmt: (v: number) => String(v), inverse: false },
      { key: "color", label: "Color",           fmt: (v: string) => v || "—",  inverse: false },
    ],
  },
];

// ── Componente principal ───────────────────────────────────────────────────
export const ComparePage = () => {
  const [allVehicles, setAllVehicles]   = useState<Vehicle[]>([]);
  const [selected, setSelected]         = useState<(Vehicle | null)[]>([null, null, null]);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [activeSlot, setActiveSlot]     = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.get("/vehicles/sales/catalog").then(res => setAllVehicles(res.data));
  }, []);

  const openModal = (idx: number) => { setActiveSlot(idx); setIsModalOpen(true); };
  const pickVehicle = (v: Vehicle) => {
    if (activeSlot !== null) {
      const next = [...selected]; next[activeSlot] = v; setSelected(next);
    }
    setIsModalOpen(false); setActiveSlot(null);
  };
  const clearSlot = (idx: number) => {
    const next = [...selected]; next[idx] = null; setSelected(next);
  };

  const hasAny = selected.some(Boolean);
  const COLORS = ["var(--brand)", "#00c7b1", "var(--warning)"];

  // SEO dinámico: si ya eligió vehículos, el título los nombra
  const selectedNames = selected.filter(Boolean).map(v => `${v!.marca} ${v!.modelo}`);
  const seoTitle = selectedNames.length >= 2
    ? `Comparar ${selectedNames.join(" vs ")} en Costa Rica`
    : "Comparador de Vehículos Eléctricos";
  const seoDesc = selectedNames.length >= 2
    ? `Compara el ${selectedNames.join(", ")} en Conejo Motors. Autonomía, precio, batería y más especificaciones.`
    : "Herramienta para comparar vehículos eléctricos en Conejo Motors Costa Rica. Compara autonomía, precio, batería y rendimiento de hasta 3 modelos.";

  return (
    <div className={stylesLayout.pageContainer}>
      <SeoHead
        title={seoTitle}
        description={seoDesc}
        canonical="/compare"
      />
      <div className={styles.compareContainer}>

        {/* ── Encabezado ── */}
        <div className={styles.pageHeader}>
          <span className={styles.pageTag}>Herramienta interactiva</span>
          <h1>Compara hasta 3 modelos</h1>
          <p>Elige los vehículos y descubre cuál se adapta mejor a tu estilo de vida.</p>
        </div>

        {/* ── Selectores ── */}
        <div className={styles.selectorsGrid} ref={stickyRef}>
          {selected.map((v, i) => (
            <div key={i} className={`${styles.selectorCard} ${v ? styles.selectorFilled : ""}`}
              style={v ? { borderColor: COLORS[i] } : {}}>
              {v ? (
                <>
                  <div className={styles.selectorColorBar} style={{ background: COLORS[i] }} />
                  <img src={v.imagenes?.[0] ? getImageUrl(v.imagenes[0].url) : "/placeholder.png"}
                    alt={`${v.marca} ${v.modelo}`} loading="lazy" />
                  <div className={styles.selectorInfo}>
                    <h3>{v.marca} {v.modelo}</h3>
                    <span className={styles.selectorYear}>{v.año}</span>
                    <p className={styles.selectorPrice}>{fmtCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                    {v.autonomia_km > 0 && (
                      <span className={styles.selectorRange}>🔋 {v.autonomia_km} km</span>
                    )}
                  </div>
                  <div className={styles.selectorActions}>
                    <button className={styles.selectorChangBtn} onClick={() => openModal(i)}>Cambiar</button>
                    <button className={styles.selectorRemoveBtn} onClick={() => clearSlot(i)} title="Quitar">✕</button>
                  </div>
                  {/* CTA por columna */}
                  <div className={styles.selectorCtas}>
                    <a href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20cotizar%20el%20${encodeURIComponent(v.marca + " " + v.modelo + " " + v.año)}`}
                      target="_blank" rel="noreferrer" className={styles.ctaQuote}
                      style={{ background: COLORS[i] }}>
                      Solicitar Cotización
                    </a>
                    <a href={`https://wa.me/50672071157?text=Hola%2C%20quiero%20agendar%20un%20test%20drive%20del%20${encodeURIComponent(v.marca + " " + v.modelo)}`}
                      target="_blank" rel="noreferrer" className={styles.ctaTest}>
                      Agendar Test Drive
                    </a>
                  </div>
                </>
              ) : (
                <div className={styles.emptySelector} onClick={() => openModal(i)}>
                  <div className={styles.emptyIcon}>+</div>
                  <span>Agregar vehículo</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Métricas de impacto ── */}
        {hasAny && <ImpactMetrics vehicles={selected} />}

        {/* ── Tabla comparativa ── */}
        {hasAny && (
          <div className={styles.tableSection}>
            <h2 className={styles.tableSectionTitle}>📊 Especificaciones Completas</h2>

            {/* Filtro de secciones en mobile */}
            <div className={styles.sectionFilters}>
              <button className={`${styles.filterBtn} ${activeSection === null ? styles.filterActive : ""}`}
                onClick={() => setActiveSection(null)}>Todas</button>
              {sections.map(s => (
                <button key={s.label}
                  className={`${styles.filterBtn} ${activeSection === s.label ? styles.filterActive : ""}`}
                  onClick={() => setActiveSection(activeSection === s.label ? null : s.label)}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.compareTable}>
                <thead>
                  <tr className={styles.stickyHeader}>
                    <th className={styles.featureCol}>Característica</th>
                    {selected.map((v, i) => (
                      <th key={i} className={styles.vehicleCol} style={{ borderTop: `3px solid ${v ? COLORS[i] : "var(--slate-200)"}` }}>
                        {v ? (
                          <div className={styles.thVehicle}>
                            <img src={v.imagenes?.[0] ? getImageUrl(v.imagenes[0].url) : "/placeholder.png"}
                              alt={v.modelo} className={styles.thImg} />
                            <span className={styles.thName}>{v.marca} {v.modelo}</span>
                            <span className={styles.thPrice}>{fmtCRC(Number(v.precio_venta_final ?? v.precio_venta))}</span>
                          </div>
                        ) : <span className={styles.thEmpty}>—</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sections
                    .filter(s => activeSection === null || s.label === activeSection)
                    .map(section => (
                    <>
                      <tr key={section.label} className={styles.sectionRow}>
                        <td colSpan={4}>{section.label}</td>
                      </tr>
                      {section.rows.map(row => {
                        const vals = selected.map(v => v ? (v as any)[row.key] as number : undefined);
                        return (
                          <tr key={row.key} className={styles.dataRow}>
                            <td className={styles.featureCell}>{row.label}</td>
                            {selected.map((v, i) => {
                              const val = v ? (v as any)[row.key] : undefined;
                              const numVal = typeof val === "number" ? val : undefined;
                              const winner = numVal !== undefined && isWinner(vals, i, row.inverse);
                              return (
                                <td key={i} className={`${styles.dataCell} ${winner ? styles.winnerCell : ""}`}>
                                  {winner && <span className={styles.winnerBadge}>✓</span>}
                                  <span>{val !== undefined && val !== null && val !== 0
                                    ? row.fmt(val as any)
                                    : "—"}</span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <p className={styles.legend}>
              <span className={styles.legendDot} /> Celda con <strong>✓</strong> = mejor valor en esa categoría
            </p>
          </div>
        )}

        {/* ── CTAs finales por columna ── */}
        {hasAny && (
          <div className={styles.finalCtaRow}>
            {selected.map((v, i) => !v ? null : (
              <div key={i} className={styles.finalCtaCard} style={{ borderColor: COLORS[i] }}>
                <p className={styles.finalCtaModel}>{v.marca} {v.modelo} ({v.año})</p>
                <p className={styles.finalCtaPrice}>{fmtCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                <a href={`https://wa.me/50672071157?text=Hola%2C%20me%20interesa%20cotizar%20el%20${encodeURIComponent(v.marca + " " + v.modelo + " " + v.año)}`}
                  target="_blank" rel="noreferrer"
                  className={styles.finalCtaBtn} style={{ background: COLORS[i] }}>
                  💬 Solicitar Cotización
                </a>
                <a href={`/catalog/${v.id}`} className={styles.finalCtaBtnSec}>
                  Ver ficha completa →
                </a>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Modal selección ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Seleccionar vehículo">
        <div className={styles.modalList}>
          {allVehicles.map(v => (
            <div key={v.id} className={styles.modalItem} onClick={() => pickVehicle(v)}>
              <img src={v.imagenes?.[0] ? getImageUrl(v.imagenes[0].url) : "/placeholder.png"}
                alt={v.modelo} loading="lazy" />
              <div className={styles.modalItemInfo}>
                <h4>{v.marca} {v.modelo} ({v.año})</h4>
                <p>{fmtCRC(Number(v.precio_venta_final ?? v.precio_venta))}</p>
                {v.autonomia_km > 0 && <span>🔋 {v.autonomia_km} km</span>}
              </div>
              <span className={styles.modalArrow}>→</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
