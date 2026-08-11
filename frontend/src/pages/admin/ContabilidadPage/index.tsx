import { useState, useEffect, useCallback, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./ContabilidadPage.module.css";
import { fmtFecha, hoyEnCR } from "@/utils/dateUtils";
import {
  LuCar, LuPackage, LuShoppingCart, LuBanknote, LuWallet, LuScale,
  LuLock, LuLockOpen, LuPencil, LuCircleCheck, LuCircleX, LuTriangleAlert,
  LuChartColumnStacked, LuSettings, LuNotebookPen, LuBuilding2, LuClipboardList,
  LuTrendingUp, LuTrendingDown, LuGem, LuFileStack, LuBookOpen, LuBookMarked,
  LuReceiptText, LuRefreshCw, LuPlus, LuInfo, LuHourglass,
} from "react-icons/lu";
import type { IconType } from "react-icons";

interface Cuenta { id: number; codigo: string; nombre: string; tipo: string; acepta_movimientos: boolean; activa: boolean; }
interface LineaAsiento { id: number; cuenta: Cuenta; debe: number; haber: number; descripcion?: string; }
interface Asiento { id: number; fecha: string; descripcion: string; tipo: string; lineas: LineaAsiento[]; creado_por?: { nombre_completo: string }; }
interface CierreDiario { id: number; fecha: string; total_ingresos: number; total_gastos: number; utilidad_neta: number; ventas_vehiculos: number; ventas_productos: number; num_transacciones: number; cerrado: boolean; }
interface Balance { cuentas: Record<string, { id: number; codigo: string; nombre: string; tipo: string; saldo: number }[]>; totales: any; equilibrado: boolean; }

const fmtCRC = (v: number) => (v < 0 ? "−" : "") + "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.abs(v));

const TIPO_ICONS: Record<string, IconType> = {
  Venta_Vehiculo: LuCar, Venta_Producto: LuPackage, Compra: LuShoppingCart,
  Gasto: LuBanknote, Ingreso: LuWallet, Ajuste: LuScale, Cierre: LuLock, Manual: LuPencil,
};

const TIPO_CUENTA_COLORS: Record<string, string> = {
  Activo: "#0891b2", Pasivo: "#dc2626", Patrimonio: "#7c3aed",
  Ingreso: "#059669", Gasto: "#d97706",
};

// Nombres legibles de las cuentas de activo
const CUENTA_NOMBRES: Record<string, string> = {
  "1500": "Edificio / Instalaciones",
  "1510": "Mobiliario y Equipo",
  "1520": "Vehículos Demo / Uso Interno",
};
const nombreCuenta = (cod: string) => CUENTA_NOMBRES[cod] ? `${cod} · ${CUENTA_NOMBRES[cod]}` : `Cuenta ${cod}`;

// Paleta categórica validada (dataviz) — orden fijo, CVD-safe
const SERIES = ["#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e34948", "#e87ba4"];

// Dona: distribución del costo de activos por cuenta contable
const DonutCuentas = ({ data }: { data: { cuenta: string; costo: number; color: string }[] }) => {
  const total = data.reduce((s, d) => s + d.costo, 0);
  if (total <= 0) return <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Sin datos.</p>;
  const R = 60, r = 38, cx = 70, cy = 70;
  let acc = 0;
  const arc = (frac0: number, frac1: number) => {
    const a0 = 2 * Math.PI * frac0 - Math.PI / 2;
    const a1 = 2 * Math.PI * frac1 - Math.PI / 2;
    const large = frac1 - frac0 > 0.5 ? 1 : 0;
    return `M ${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 0 ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} Z`;
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Costo de activos por cuenta">
        {data.length === 1 ? (
          // Una sola cuenta: anillo completo (el arco degeneraría con inicio=fin)
          <>
            <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke={data[0].color} strokeWidth={R - r} />
          </>
        ) : (
          data.map((d) => {
            const f0 = acc / total; acc += d.costo; const f1 = acc / total;
            return <path key={d.cuenta} d={arc(f0, f1)} fill={d.color} stroke="#fff" strokeWidth={1.5} />;
          })
        )}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.8rem" }}>
        {data.map((d) => (
          <div key={d.cuenta} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ color: "#334155" }}>{nombreCuenta(d.cuenta)}</span>
            <strong style={{ color: "var(--brand-dark)", marginLeft: "auto" }}>{fmtCRC(d.costo)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

// Barras: valor neto vs depreciación acumulada por cuenta (suman el costo)
const BarrasNeto = ({ data }: { data: { cuenta: string; costo: number; dep: number; neto: number }[] }) => {
  const max = Math.max(...data.map((d) => d.costo), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      {data.map((d) => (
        <div key={d.cuenta}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 2 }}>
            <span style={{ color: "#334155" }}>{nombreCuenta(d.cuenta)}</span>
            <span style={{ color: "#64748b" }}>neto {fmtCRC(d.neto)} · dep {fmtCRC(d.dep)}</span>
          </div>
          <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", background: "#f1f5f9", width: `${(d.costo / max) * 100}%`, minWidth: "30%", gap: 2 }}>
            <div title={`Valor neto ${fmtCRC(d.neto)}`} style={{ background: "#2a78d6", width: `${(d.neto / d.costo) * 100}%`, borderRadius: "4px 0 0 4px" }} />
            <div title={`Depreciación ${fmtCRC(d.dep)}`} style={{ background: "#eda100", width: `${(d.dep / d.costo) * 100}%` }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#2a78d6", borderRadius: 2, marginRight: 4 }} />Valor neto</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#eda100", borderRadius: 2, marginRight: 4 }} />Depreciación acumulada</span>
      </div>
    </div>
  );
};

const inputStyle: CSSProperties = { display: "block", width: "100%", marginTop: 4, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" };
const thStyle: CSSProperties = { padding: "0.6rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" };
const tdStyle: CSSProperties = { padding: "0.55rem 0.8rem", color: "#334155" };

export const ContabilidadPage = () => {
  const [tab, setTab] = useState<"dashboard" | "cuentas" | "asientos" | "balance" | "cierres" | "activos">("dashboard");
  const [activos, setActivos] = useState<{ items: any[]; totales: any } | null>(null);
  const [showMigrar, setShowMigrar] = useState(false);
  const [vehiculosInv, setVehiculosInv] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [categoriasDep, setCategoriasDep] = useState<any[]>([]);
  const [showFiscal, setShowFiscal] = useState(false);
  const [fiscal, setFiscal] = useState<any | null>(null);
  const [tasaRenta, setTasaRenta] = useState(30);
  const [cierresPeriodo, setCierresPeriodo] = useState<any[]>([]);
  const [periodoCierre, setPeriodoCierre] = useState(() => hoyEnCR().slice(0, 7));
  const [tipoCierre, setTipoCierre] = useState<"Mensual" | "Anual">("Mensual");
  const [activoForm, setActivoForm] = useState({ nombre: "", categoria: "Mobiliario", cuenta_activo: "1510", costo: 0, valor_residual: 0, vida_util_meses: 60, contrapartida: "2100", notas: "" });
  const [savingActivo, setSavingActivo] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [cierres, setCierres] = useState<CierreDiario[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(hoyEnCR());
  const [endDate, setEndDate] = useState(hoyEnCR());
  const [resumenMes, setResumenMes] = useState<any>(null);

  // Formulario asiento
  const [showAsientoForm, setShowAsientoForm] = useState(false);
  const [asientoForm, setAsientoForm] = useState({ fecha: hoyEnCR(), descripcion: "", tipo: "Manual" });
  const [lineasForm, setLineasForm] = useState<{ cuentaId: number; debe: number; haber: number; descripcion: string }[]>([
    { cuentaId: 0, debe: 0, haber: 0, descripcion: "" },
    { cuentaId: 0, debe: 0, haber: 0, descripcion: "" },
  ]);
  const [savingAsiento, setSavingAsiento] = useState(false);

  // Nueva cuenta
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ codigo: "", nombre: "", tipo: "Activo", descripcion: "" });
  const [savingCuenta, setSavingCuenta] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const hoy = hoyEnCR();
      const primerDiaMes = hoy.slice(0, 7) + "-01";
      const [c, a, b, ci, p, ch, mes] = await Promise.all([
        apiClient.get("/contabilidad/cuentas"),
        apiClient.get(`/contabilidad/asientos?startDate=${startDate}&endDate=${endDate}`),
        apiClient.get(`/contabilidad/balance?endDate=${endDate}`),
        apiClient.get("/contabilidad/cierres"),
        apiClient.get("/contabilidad/cierres/preview"),
        apiClient.get("/finanzas/checklist-cierre").catch(() => ({ data: null })),
        apiClient.get(`/contabilidad/resumen-periodo?startDate=${primerDiaMes}&endDate=${hoy}`),
      ]);
      setCuentas(Array.isArray(c.data) ? c.data : []);
      setAsientos(Array.isArray(a.data) ? a.data : []);
      setBalance(b.data);
      setCierres(Array.isArray(ci.data) ? ci.data : []);
      setPreview(p.data);
      setChecklist(ch.data);
      setResumenMes(mes.data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const seedCuentas = async () => {
    try {
      const res = await apiClient.post("/contabilidad/cuentas/seed");
      toast.success(`✅ ${res.data.seeded} cuentas creadas.`);
      fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error"); }
  };

  const cargarInventarioInicial = async () => {
    if (!window.confirm("Se generará el asiento de apertura del inventario para los vehículos en stock que aún no tengan asiento contable (contra 'Balance de Apertura'). ¿Continuar?")) return;
    try {
      const res = await apiClient.post("/vehicles/inventario/carga-inicial");
      const { creados, omitidos, monto_total } = res.data;
      toast.success(`✅ ${creados} vehículo(s) cargados (₡${Number(monto_total).toLocaleString("es-CR")}). ${omitidos} omitidos.`);
      fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al cargar inventario."); }
  };

  // ── Activos Fijos ─────────────────────────────────────────────────────────
  const fetchActivos = useCallback(async () => {
    try {
      const res = await apiClient.get("/activos-fijos");
      setActivos(res.data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (tab === "activos") {
      fetchActivos();
      apiClient.get("/depreciacion/categorias?activas=true").then((r) => setCategoriasDep(r.data ?? [])).catch(() => {});
    }
  }, [tab, fetchActivos]);

  const crearActivo = async () => {
    if (!activoForm.nombre.trim()) { toast.error("Poné un nombre."); return; }
    if (!(activoForm.costo > 0)) { toast.error("El costo debe ser mayor a 0."); return; }
    setSavingActivo(true);
    try {
      await apiClient.post("/activos-fijos", activoForm);
      toast.success("✅ Activo fijo registrado.");
      setActivoForm({ nombre: "", categoria: "Mobiliario", cuenta_activo: "1510", costo: 0, valor_residual: 0, vida_util_meses: 60, contrapartida: "2100", notas: "" });
      fetchActivos();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al registrar."); }
    finally { setSavingActivo(false); }
  };

  // ── Cierres de período ────────────────────────────────────────────────────
  const fetchCierresPeriodo = useCallback(async () => {
    try {
      const res = await apiClient.get("/contabilidad/cierres-periodo");
      setCierresPeriodo(res.data ?? []);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { if (tab === "cierres") fetchCierresPeriodo(); }, [tab, fetchCierresPeriodo]);

  const cerrarPeriodo = async () => {
    const periodo = tipoCierre === "Anual" ? periodoCierre.slice(0, 4) : periodoCierre;
    if (!window.confirm(`Se cerrará el período ${periodo} (${tipoCierre}): se genera el asiento de cierre y se BLOQUEA para nuevos asientos. ¿Continuar?`)) return;
    try {
      await apiClient.post("/contabilidad/cierres-periodo", { periodo, tipo: tipoCierre });
      toast.success(`🔒 Período ${periodo} cerrado.`);
      fetchCierresPeriodo();
      fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al cerrar el período."); }
  };

  const reabrirPeriodo = async (periodo: string) => {
    if (!window.confirm(`¿Reabrir el período ${periodo}? Se permitirán nuevos asientos con esa fecha.`)) return;
    try {
      await apiClient.post("/contabilidad/cierres-periodo/reabrir", { periodo });
      toast.success(`🔓 Período ${periodo} reabierto.`);
      fetchCierresPeriodo();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error."); }
  };

  const darDeBajaActivo = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Dar de baja "${nombre}"? Se generará el asiento de baja.`)) return;
    try {
      await apiClient.patch(`/activos-fijos/${id}/baja`);
      toast.success("Activo dado de baja.");
      fetchActivos();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error."); }
  };

  const fetchFiscal = useCallback(async (tasa: number) => {
    try {
      const r = await apiClient.get(`/activos-fijos/reporte-fiscal?tasa=${tasa / 100}`);
      setFiscal(r.data);
    } catch { toast.error("No se pudo cargar el reporte fiscal."); }
  }, []);

  const toggleFiscal = () => {
    setShowFiscal((s) => !s);
    if (!showFiscal) fetchFiscal(tasaRenta);
  };

  // Agregación de activos por cuenta contable (para los gráficos)
  const activosPorCuenta = useMemo(() => {
    if (!activos) return [] as { cuenta: string; costo: number; dep: number; neto: number; color: string }[];
    const map = new Map<string, { costo: number; dep: number; neto: number }>();
    for (const a of activos.items) {
      const k = a.cuenta ?? "—";
      const cur = map.get(k) ?? { costo: 0, dep: 0, neto: 0 };
      cur.costo += a.costo; cur.dep += a.depreciacion_acumulada; cur.neto += a.valor_neto;
      map.set(k, cur);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].costo - a[1].costo)
      .map(([cuenta, v], i) => ({ cuenta, ...v, color: SERIES[i % SERIES.length] }));
  }, [activos]);

  // Migración de vehículos de inventario (venta) → uso interno (Demo)
  const abrirMigrar = async () => {
    setShowMigrar((s) => !s);
    if (!showMigrar) {
      try {
        const r = await apiClient.get("/vehicles");
        setVehiculosInv((r.data ?? []).filter((v: any) => v.estado === "Disponible" || v.estado === "Reservado"));
      } catch { toast.error("No se pudieron cargar los vehículos."); }
    }
  };

  const migrarVehiculo = async (id: number, nombre: string) => {
    if (!window.confirm(`Migrar "${nombre}" a uso interno (Demo). Se genera el asiento 1300→1520 y sale del catálogo. ¿Continuar?`)) return;
    try {
      await apiClient.patch(`/vehicles/${id}/demo`);
      toast.success("Vehículo migrado a uso interno.");
      setVehiculosInv((prev) => prev.filter((v) => v.id !== id));
      fetchActivos();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al migrar."); }
  };

  const guardarEdicion = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    try {
      if (editItem.tipo === "Vehículo Demo") {
        await apiClient.patch(`/vehicles/${editItem.id}/demo-datos`, {
          placa: editItem.placa ?? "",
          marchamo: Number(editItem.marchamo) || 0,
          valor_residual_demo: Number(editItem.valor_residual) || 0,
          vida_util_meses_demo: Number(editItem.vida_util_meses) || 60,
          vida_util_fiscal_meses_demo: Number(editItem.vida_util_fiscal_meses) || 120,
        });
      } else {
        await apiClient.patch(`/activos-fijos/${editItem.id}`, {
          nombre: editItem.nombre,
          vida_util_meses: Number(editItem.vida_util_meses) || 60,
          valor_residual: Number(editItem.valor_residual) || 0,
          vida_util_fiscal_meses: Number(editItem.vida_util_fiscal_meses) || 120,
          metodo_fiscal: editItem.metodo_fiscal ?? "LineaRecta",
          numero_inventario: editItem.numero_inventario ?? "",
          localizacion: editItem.localizacion ?? "",
          notas: editItem.notas ?? "",
        });
      }
      toast.success("Activo actualizado.");
      setEditItem(null);
      fetchActivos();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al guardar."); }
    finally { setSavingEdit(false); }
  };

  const venderActivo = async (id: number, nombre: string) => {
    const montoStr = window.prompt(`Vender "${nombre}". ¿Monto de venta recibido (₡)?`, "0");
    if (montoStr === null) return;
    const monto = Number(montoStr);
    if (!(monto >= 0)) { toast.error("Monto inválido."); return; }
    try {
      await apiClient.patch(`/activos-fijos/${id}/vender`, { monto });
      toast.success("Venta de activo registrada.");
      fetchActivos();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error."); }
  };

  // ── Suma partida doble ────────────────────────────────────────────────────
  const sumaDebe  = lineasForm.reduce((s, l) => s + (l.debe  || 0), 0);
  const sumaHaber = lineasForm.reduce((s, l) => s + (l.haber || 0), 0);
  const cuadrado  = Math.abs(sumaDebe - sumaHaber) < 0.01;

  const agregarLinea = () =>
    setLineasForm(prev => [...prev, { cuentaId: 0, debe: 0, haber: 0, descripcion: "" }]);

  const removeLinea = (i: number) =>
    setLineasForm(prev => prev.filter((_, j) => j !== i));

  const handleGuardarAsiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadrado) { toast.error("El asiento no cuadra. Debe = Haber."); return; }
    const lineasValidas = lineasForm.filter(l => l.cuentaId && (l.debe || l.haber));
    if (lineasValidas.length < 2) { toast.error("Se requieren al menos 2 líneas."); return; }
    setSavingAsiento(true);
    try {
      await apiClient.post("/contabilidad/asientos", { ...asientoForm, lineas: lineasValidas });
      toast.success("✅ Asiento registrado.");
      setShowAsientoForm(false);
      fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error"); }
    finally { setSavingAsiento(false); }
  };

  const handleGuardarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCuenta(true);
    try {
      await apiClient.post("/contabilidad/cuentas", cuentaForm);
      toast.success("✅ Cuenta creada.");
      setShowCuentaForm(false);
      setCuentaForm({ codigo: "", nombre: "", tipo: "Activo", descripcion: "" });
      fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error"); }
    finally { setSavingCuenta(false); }
  };

  const handleCierre = async () => {
    if (!confirm(`¿Cerrar el día ${hoyEnCR()}? Esta acción no se puede deshacer.`)) return;
    try {
      await apiClient.post("/contabilidad/cierres", { fecha: hoyEnCR() });
      toast.success("✅ Cierre del día realizado.");
      fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error"); }
  };

  const cuentasActivas = cuentas.filter(c => c.acepta_movimientos && c.activa);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><LuChartColumnStacked size={22} /> Contabilidad</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {cuentas.length === 0 && (
            <button className={styles.seedBtn} onClick={seedCuentas} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <LuSettings size={16} /> Inicializar Plan de Cuentas Estándar
            </button>
          )}
          {cuentas.length > 0 && (
            <button className={styles.seedBtn} onClick={cargarInventarioInicial} title="Genera el asiento de apertura del inventario de vehículos en stock" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <LuCar size={16} /> Cargar inventario inicial
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {[
          { key: "dashboard", label: "Resumen", Icon: LuChartColumnStacked },
          { key: "asientos",  label: "Asientos", Icon: LuNotebookPen },
          { key: "balance",   label: "Balance", Icon: LuScale },
          { key: "activos",   label: "Activos Fijos", Icon: LuBuilding2 },
          { key: "cierres",   label: "Cierres", Icon: LuLock },
          { key: "cuentas",   label: "Plan de Cuentas", Icon: LuClipboardList },
        ].map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key as any)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <t.Icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: Dashboard ══════════════════════════════════════════════════ */}
      {tab === "dashboard" && preview && (
        <div>
          {/* ── Resumen del día ── */}
          <div className={styles.sectionTitle}>Resumen del Día — {fmtFecha(preview.fecha)}</div>
          <div className={styles.kpiRow}>
            <KpiCard icon={<LuWallet size={20} />} label="Ingresos Hoy" value={fmtCRC(preview.ingresos)} color="#059669" />
            <KpiCard icon={<LuBanknote size={20} />} label="Gastos Hoy" value={fmtCRC(preview.gastos)} color="#dc2626" />
            <KpiCard icon={<LuTrendingUp size={20} />} label="Utilidad Hoy" value={fmtCRC(preview.utilidad)} color={preview.utilidad >= 0 ? "#0891b2" : "#dc2626"} />
            <KpiCard icon={<LuNotebookPen size={20} />} label="Asientos" value={String(preview.num_asientos)} color="#7c3aed" />
          </div>

          {(preview.ventas_vehiculos > 0 || preview.ventas_productos > 0) && (
            <div className={styles.ventasRow}>
              {preview.ventas_vehiculos > 0 && <div className={styles.ventaCard}><span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuCar size={14} /> Ventas Vehículos</span><strong>{fmtCRC(preview.ventas_vehiculos)}</strong></div>}
              {preview.ventas_productos > 0 && <div className={styles.ventaCard}><span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuPackage size={14} /> Ventas Repuestos</span><strong>{fmtCRC(preview.ventas_productos)}</strong></div>}
            </div>
          )}

          {/* Cierre del día */}
          <div className={styles.cierreBox}>
            {preview.ya_cerrado ? (
              <div className={styles.cierreOk} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><LuLock size={16} /> El día de hoy ya fue cerrado.</div>
            ) : (
              <>
                <p className={styles.cierreHint}>El día aún no ha sido cerrado. Al cerrar, se consolida el balance del día.</p>
                <button className={styles.cierreBtn} onClick={handleCierre} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuLock size={16} /> Realizar Cierre del Día</button>
              </>
            )}
          </div>

          {/* ── Resumen del mes ── */}
          {resumenMes && (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
                Mes en Curso — {new Date().toLocaleDateString("es-CR", { month: "long", year: "numeric" })}
              </div>
              <div className={styles.kpiRow}>
                <KpiCard icon={<LuWallet size={20} />} label="Ingresos MTD" value={fmtCRC(resumenMes.ingresos)} color="#059669" />
                <KpiCard icon={<LuBanknote size={20} />} label="Gastos MTD" value={fmtCRC(resumenMes.gastos)} color="#dc2626" />
                <KpiCard icon={<LuTrendingUp size={20} />} label="Utilidad MTD" value={fmtCRC(resumenMes.utilidad)} color={resumenMes.utilidad >= 0 ? "#0891b2" : "#dc2626"} />
                <KpiCard icon={<LuNotebookPen size={20} />} label="Asientos MTD" value={String(resumenMes.num_asientos)} color="#7c3aed" />
              </div>

              {/* Desglose de gastos del mes */}
              {resumenMes.gastos_por_tipo && Object.keys(resumenMes.gastos_por_tipo).length > 0 && (
                <div style={{ background: "var(--bg-card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, padding: "1rem 1.25rem", marginTop: "1rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <LuBanknote size={15} /> Desglose de Gastos del Mes
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {Object.entries(resumenMes.gastos_por_tipo as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([nombre, monto]) => {
                        const pct = resumenMes.gastos > 0 ? Math.round((monto / resumenMes.gastos) * 100) : 0;
                        return (
                          <div key={nombre} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ flex: 1, fontSize: "0.88rem" }}>{nombre}</span>
                            <div style={{ flex: 2, background: "#f1f5f9", borderRadius: 6, height: 8, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "#dc2626", borderRadius: 6, transition: "width 0.4s" }} />
                            </div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#dc2626", minWidth: 90, textAlign: "right" }}>{fmtCRC(monto)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", minWidth: 32, textAlign: "right" }}>{pct}%</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Últimos asientos del rango seleccionado */}
          <div className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>Últimos Asientos</div>
          <AsientosTable asientos={asientos.slice(0, 10)} />
        </div>
      )}

      {/* ══ TAB: Asientos ═══════════════════════════════════════════════════ */}
      {tab === "asientos" && (
        <>
          <div className={styles.topBar}>
            <div className={styles.dateRange}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} />
              <span>—</span>
              <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className={styles.dateInput} />
            </div>
            <button className={styles.newBtn} onClick={() => setShowAsientoForm(!showAsientoForm)}>
              + Nuevo Asiento Manual
            </button>
          </div>

          {showAsientoForm && (
            <form onSubmit={handleGuardarAsiento} className={styles.asientoForm}>
              <h3>Nuevo Asiento Contable</h3>
              <div className={styles.asientoMeta}>
                <div className={styles.field}><label>Fecha</label>
                  <input type="date" value={asientoForm.fecha} onChange={e => setAsientoForm(f => ({ ...f, fecha: e.target.value }))} required /></div>
                <div className={`${styles.field} ${styles.grow}`}><label>Descripción</label>
                  <input value={asientoForm.descripcion} onChange={e => setAsientoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Pago de nómina julio 2026" required /></div>
                <div className={styles.field}><label>Tipo</label>
                  <select value={asientoForm.tipo} onChange={e => setAsientoForm(f => ({ ...f, tipo: e.target.value }))}>
                    {["Manual","Gasto","Ingreso","Compra","Ajuste"].map(t => <option key={t}>{t}</option>)}
                  </select></div>
              </div>

              <div className={styles.lineasTable}>
                <div className={styles.lineasHeader}>
                  <span>Cuenta</span><span>Descripción</span><span>Debe (₡)</span><span>Haber (₡)</span><span></span>
                </div>
                {lineasForm.map((l, i) => (
                  <div key={i} className={styles.lineaRow}>
                    <select value={l.cuentaId} onChange={e => { const n=[...lineasForm]; n[i].cuentaId=Number(e.target.value); setLineasForm(n); }}>
                      <option value={0}>— Seleccionar cuenta —</option>
                      {["Activo","Pasivo","Patrimonio","Ingreso","Gasto"].map(tipo => (
                        <optgroup key={tipo} label={tipo}>
                          {cuentasActivas.filter(c => c.tipo === tipo).map(c => (
                            <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input placeholder="Descripción línea" value={l.descripcion} onChange={e => { const n=[...lineasForm]; n[i].descripcion=e.target.value; setLineasForm(n); }} />
                    <input type="number" min={0} value={l.debe || ""} placeholder="0" onChange={e => { const n=[...lineasForm]; n[i].debe=Number(e.target.value); setLineasForm(n); }} />
                    <input type="number" min={0} value={l.haber || ""} placeholder="0" onChange={e => { const n=[...lineasForm]; n[i].haber=Number(e.target.value); setLineasForm(n); }} />
                    <button type="button" className={styles.removeBtn} onClick={() => removeLinea(i)}>✕</button>
                  </div>
                ))}
                <div className={styles.lineasFooter}>
                  <button type="button" className={styles.addLineaBtn} onClick={agregarLinea}>+ Agregar línea</button>
                  <div className={`${styles.cuadre} ${cuadrado ? styles.cuadreOk : styles.cuadreMal}`}>
                    Debe: {fmtCRC(sumaDebe)} | Haber: {fmtCRC(sumaHaber)}
                    {" "}{cuadrado ? <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><LuCircleCheck size={14} /> Cuadrado</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><LuCircleX size={14} /> No cuadra</span>}
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className="btn btn-principal" disabled={savingAsiento || !cuadrado}>
                  {savingAsiento ? "Guardando..." : "Registrar Asiento"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAsientoForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <AsientosTable asientos={asientos} />
        </>
      )}

      {/* ══ TAB: Balance ════════════════════════════════════════════════════ */}
      {tab === "balance" && balance && (
        <>
          <div className={styles.topBar}>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} />
            <span className={styles.hint}>Balance acumulado hasta la fecha seleccionada</span>
          </div>

          <div className={styles.balanceGrid}>
            {Object.entries(balance.cuentas).map(([tipo, cuentasList]) => (
              cuentasList.length > 0 && (
                <div key={tipo} className={styles.balanceGroup}>
                  <div className={styles.balanceGroupHeader} style={{ borderLeftColor: TIPO_CUENTA_COLORS[tipo] }}>
                    <span className={styles.balanceTipo}>{tipo}</span>
                    <span className={styles.balanceTipoTotal}>
                      {fmtCRC(cuentasList.reduce((s, c) => s + c.saldo, 0))}
                    </span>
                  </div>
                  {cuentasList.map(c => (
                    <div key={c.id} className={styles.balanceLine}>
                      <span className={styles.balanceCodigo}>{c.codigo}</span>
                      <span className={styles.balanceNombre}>{c.nombre}</span>
                      <span className={`${styles.balanceSaldo} ${c.saldo < 0 ? styles.saldoNeg : ""}`}>
                        {fmtCRC(c.saldo)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>

          <div className={styles.balanceSummary}>
            <div className={styles.summaryRow}><span>Total Activos:</span><strong>{fmtCRC(balance.totales.totalActivos)}</strong></div>
            <div className={styles.summaryRow}><span>Total Pasivos:</span><strong>{fmtCRC(balance.totales.totalPasivos)}</strong></div>
            <div className={styles.summaryRow}><span>Patrimonio:</span><strong>{fmtCRC(balance.totales.totalPatrimonio)}</strong></div>
            <div className={styles.summaryRow}><span>Total Ingresos:</span><strong className={styles.positive}>{fmtCRC(balance.totales.totalIngresos)}</strong></div>
            <div className={styles.summaryRow}><span>Total Gastos:</span><strong className={styles.negative}>{fmtCRC(balance.totales.totalGastos)}</strong></div>
            <div className={`${styles.summaryRow} ${styles.utilidadRow}`}>
              <span>Utilidad Neta:</span>
              <strong className={balance.totales.utilidad >= 0 ? styles.positive : styles.negative}>
                {fmtCRC(balance.totales.utilidad)}
              </strong>
            </div>
            <div className={styles.equilibrioChip} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {balance.equilibrado ? <><LuCircleCheck size={15} /> Balance en equilibrio</> : <><LuTriangleAlert size={15} /> Balance desbalanceado — revisar asientos</>}
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: Activos Fijos ══════════════════════════════════════════════ */}
      {tab === "activos" && (
        <>
          <div className={styles.sectionTitle}>Activos Fijos</div>
          {activos && (
            <div className={styles.kpiRow}>
              <KpiCard icon={<LuBuilding2 size={20} />} label="Costo total" value={fmtCRC(activos.totales.costo)} color="#0891b2" />
              <KpiCard icon={<LuTrendingDown size={20} />} label="Depreciación acumulada" value={fmtCRC(activos.totales.depreciacion_acumulada)} color="#dc2626" />
              <KpiCard icon={<LuGem size={20} />} label="Valor neto en libros" value={fmtCRC(activos.totales.valor_neto)} color="#059669" />
            </div>
          )}

          {/* Gráficos por cuenta contable */}
          {activosPorCuenta.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", margin: "1rem 0" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>Costo por cuenta</div>
                <DonutCuentas data={activosPorCuenta} />
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>Valor neto vs. depreciación</div>
                <BarrasNeto data={activosPorCuenta} />
              </div>
            </div>
          )}

          {/* Reporte fiscal — diferencia libro-fiscal e impuesto diferido */}
          <div style={{ margin: "1rem 0" }}>
            <button onClick={toggleFiscal} className={styles.seedBtn} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <LuFileStack size={16} /> {showFiscal ? "Cerrar reporte fiscal" : "Reporte fiscal (impuesto diferido)"}
            </button>
            {showFiscal && fiscal && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", marginTop: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0, maxWidth: 560 }}>
                    Diferencia entre la depreciación <strong>financiera</strong> (mayor) y la <strong>fiscal</strong> (Anexo 2). La diferencia temporaria genera el impuesto diferido. El carril fiscal NO afecta la contabilidad.
                  </p>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>Tasa de renta %
                    <input type="number" value={tasaRenta} onChange={(e) => setTasaRenta(Number(e.target.value))} onBlur={() => fetchFiscal(tasaRenta)} style={{ ...inputStyle, width: 80, display: "inline-block", marginLeft: 8 }} />
                  </label>
                </div>
                <div className={styles.kpiRow}>
                  <KpiCard icon={<LuBookOpen size={20} />} label="Dep. financiera acum." value={fmtCRC(fiscal.totales.dep_financiera)} color="#0891b2" />
                  <KpiCard icon={<LuBookMarked size={20} />} label="Dep. fiscal acum." value={fmtCRC(fiscal.totales.dep_fiscal)} color="#d97706" />
                  <KpiCard icon={<LuScale size={20} />} label="Diferencia temporaria" value={fmtCRC(fiscal.totales.diferencia_temporaria)} color="#7c3aed" />
                  <KpiCard icon={<LuReceiptText size={20} />} label={`Impuesto diferido (${tasaRenta}%)`} value={fmtCRC(fiscal.totales.impuesto_diferido)} color="#15803d" />
                </div>
                <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 620 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                        <th style={thStyle}>Activo</th>
                        <th style={{ ...thStyle, textAlign: "center" }}>Vida fin/fiscal</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Dep. financiera</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Dep. fiscal</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fiscal.items.map((it: any) => (
                        <tr key={`${it.tipo}-${it.id}`} style={{ borderTop: "1px solid #f1f5f9" }}>
                          <td style={tdStyle}>{it.nombre}</td>
                          <td style={{ ...tdStyle, textAlign: "center", color: "#64748b" }}>{it.vida_financiera}/{it.vida_fiscal} m</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmtCRC(it.dep_financiera)}</td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>{fmtCRC(it.dep_fiscal)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: it.diferencia >= 0 ? "#7c3aed" : "#dc2626" }}>{fmtCRC(it.diferencia)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Migración de vehículos de venta → uso interno */}
          <div style={{ margin: "1rem 0" }}>
            <button onClick={abrirMigrar} className={styles.seedBtn} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <LuRefreshCw size={16} /> {showMigrar ? "Cerrar migración" : "Migrar vehículo a uso interno"}
            </button>
            {showMigrar && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", marginTop: "0.75rem" }}>
                <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 0 }}>
                  Reclasifica un vehículo del inventario de venta (1300) a activo fijo de uso interno / demo (1520). Genera el asiento y lo saca del catálogo.
                </p>
                {vehiculosInv.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No hay vehículos disponibles para migrar.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 260, overflowY: "auto" }}>
                    {vehiculosInv.map((v) => (
                      <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.4rem", fontSize: "0.85rem" }}>
                        <span>{v.marca} {v.modelo} <span style={{ color: "#94a3b8" }}>· VIN {v.vin} · {fmtCRC(Number(v.precio_costo) || 0)}</span></span>
                        <button onClick={() => migrarVehiculo(v.id, `${v.marca} ${v.modelo}`)} style={{ background: "#ede9fe", border: "1px solid #ddd6fe", color: "#7c3aed", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>Migrar →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formulario alta */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", margin: "1rem 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Nombre
              <input value={activoForm.nombre} onChange={(e) => setActivoForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Elevador de taller" style={inputStyle} />
            </label>
            {categoriasDep.length > 0 ? (
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Categoría (tabla depreciación)
                <select
                  value={activoForm.categoria}
                  onChange={(e) => {
                    const cat = categoriasDep.find((c) => c.nombre === e.target.value);
                    setActivoForm(f => ({
                      ...f,
                      categoria: e.target.value,
                      cuenta_activo: cat?.cuenta_activo ?? f.cuenta_activo,
                      vida_util_meses: cat?.vida_util_meses ?? f.vida_util_meses,
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value="">— elegir —</option>
                  {categoriasDep.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </label>
            ) : (
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Categoría
                <select value={activoForm.categoria} onChange={(e) => {
                  const categoria = e.target.value;
                  const cuenta_activo = categoria === "Edificio / Instalaciones" ? "1500" : "1510";
                  setActivoForm(f => ({ ...f, categoria, cuenta_activo }));
                }} style={inputStyle}>
                  <option>Mobiliario</option>
                  <option>Equipo de Cómputo</option>
                  <option>Equipo de Taller</option>
                  <option>Edificio / Instalaciones</option>
                  <option>Otro</option>
                </select>
              </label>
            )}
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Costo (₡)
              <input type="number" value={activoForm.costo || ""} onChange={(e) => setActivoForm(f => ({ ...f, costo: Number(e.target.value) }))} style={inputStyle} />
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Valor residual (₡)
              <input type="number" value={activoForm.valor_residual || ""} onChange={(e) => setActivoForm(f => ({ ...f, valor_residual: Number(e.target.value) }))} style={inputStyle} />
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Vida útil (meses)
              <input type="number" value={activoForm.vida_util_meses || ""} onChange={(e) => setActivoForm(f => ({ ...f, vida_util_meses: Number(e.target.value) }))} style={inputStyle} />
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Se pagó con
              <select value={activoForm.contrapartida} onChange={(e) => setActivoForm(f => ({ ...f, contrapartida: e.target.value }))} style={inputStyle}>
                <option value="2100">Crédito (Cuentas por Pagar)</option>
                <option value="1110">Banco</option>
                <option value="1100">Caja</option>
              </select>
            </label>
            <button onClick={crearActivo} disabled={savingActivo} className={styles.seedBtn} style={{ height: 38, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              {savingActivo ? "Guardando…" : <><LuPlus size={16} /> Registrar activo</>}
            </button>
          </div>

          {/* Tabla */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                  <th style={thStyle}>Activo</th><th style={thStyle}>Tipo</th><th style={thStyle}>Cuenta</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Costo</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Dep. acum.</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Valor neto</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {(!activos || activos.items.length === 0) ? (
                  <tr><td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Sin activos fijos registrados.</td></tr>
                ) : activos.items.map((a) => (
                  <tr key={`${a.tipo}-${a.id}`} style={{ borderTop: "1px solid #f1f5f9", opacity: a.activo ? 1 : 0.5 }}>
                    <td style={tdStyle}>{a.nombre}</td>
                    <td style={tdStyle}><span style={{ fontSize: "0.72rem", background: a.tipo === "Vehículo Demo" ? "#ede9fe" : "#e0f2fe", color: a.tipo === "Vehículo Demo" ? "#7c3aed" : "#0369a1", borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>{a.tipo}</span></td>
                    <td style={tdStyle}>{a.cuenta}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtCRC(a.costo)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#dc2626" }}>{fmtCRC(a.depreciacion_acumulada)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmtCRC(a.valor_neto)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ display: "inline-flex", gap: "0.35rem" }}>
                        {a.activo && (
                          <button onClick={() => setEditItem({ ...a })} style={{ background: "none", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem" }}>Editar</button>
                        )}
                        {a.tipo === "Activo" && a.activo && (
                          <>
                            <button onClick={() => venderActivo(a.id, a.nombre)} style={{ background: "none", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem" }}>Vender</button>
                            <button onClick={() => darDeBajaActivo(a.id, a.nombre)} style={{ background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem" }}>Dar de baja</button>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            La depreciación se calcula automáticamente el día 1 de cada mes (línea recta), sobre la base costo − valor residual y la vida útil de cada activo (editable).
          </p>

          {/* Modal de edición */}
          {editItem && (
            <div onClick={() => setEditItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "1.25rem", width: "min(460px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
                <h3 style={{ margin: "0 0 0.25rem", color: "var(--brand-dark)" }}>Editar activo</h3>
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#64748b" }}>{editItem.nombre}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {editItem.tipo === "Activo" && (
                    <label style={{ gridColumn: "1 / -1", fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Nombre
                      <input value={editItem.nombre} onChange={(e) => setEditItem({ ...editItem, nombre: e.target.value })} style={inputStyle} />
                    </label>
                  )}
                  {editItem.tipo === "Vehículo Demo" && (
                    <>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Placa
                        <input value={editItem.placa ?? ""} onChange={(e) => setEditItem({ ...editItem, placa: e.target.value })} placeholder="Ej: CM-1234" style={inputStyle} />
                      </label>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Marchamo (₡)
                        <input type="number" value={editItem.marchamo ?? 0} onChange={(e) => setEditItem({ ...editItem, marchamo: e.target.value })} style={inputStyle} />
                      </label>
                    </>
                  )}
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Vida financiera (meses)
                    <input type="number" value={editItem.vida_util_meses ?? 60} onChange={(e) => setEditItem({ ...editItem, vida_util_meses: e.target.value })} style={inputStyle} />
                  </label>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Valor residual (₡)
                    <input type="number" value={editItem.valor_residual ?? 0} onChange={(e) => setEditItem({ ...editItem, valor_residual: e.target.value })} style={inputStyle} />
                  </label>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }} title="Vida útil fiscal (Anexo 2) — solo renta, no afecta el mayor">Vida fiscal (meses)
                    <input type="number" value={editItem.vida_util_fiscal_meses ?? 120} onChange={(e) => setEditItem({ ...editItem, vida_util_fiscal_meses: e.target.value })} style={inputStyle} />
                  </label>
                  {editItem.tipo === "Activo" && (
                    <>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Método fiscal
                        <select value={editItem.metodo_fiscal ?? "LineaRecta"} onChange={(e) => setEditItem({ ...editItem, metodo_fiscal: e.target.value })} style={inputStyle}>
                          <option value="LineaRecta">Línea recta</option>
                          <option value="SumaDigitos">Suma de dígitos</option>
                        </select>
                      </label>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>N° inventario
                        <input value={editItem.numero_inventario ?? ""} onChange={(e) => setEditItem({ ...editItem, numero_inventario: e.target.value })} style={inputStyle} />
                      </label>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Localización
                        <input value={editItem.localizacion ?? ""} onChange={(e) => setEditItem({ ...editItem, localizacion: e.target.value })} style={inputStyle} />
                      </label>
                    </>
                  )}
                  {editItem.tipo === "Activo" && (
                    <label style={{ gridColumn: "1 / -1", fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Notas
                      <textarea value={editItem.notas ?? ""} onChange={(e) => setEditItem({ ...editItem, notas: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                    </label>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
                  <button onClick={() => setEditItem(null)} style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer" }}>Cancelar</button>
                  <button onClick={guardarEdicion} disabled={savingEdit} className={styles.seedBtn}>{savingEdit ? "Guardando…" : "Guardar"}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ TAB: Cierres ════════════════════════════════════════════════════ */}
      {tab === "cierres" && (
        <>
        {/* Cierre de período con bloqueo */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuLock size={16} /> Cierre de período</strong>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Salda ingresos/gastos a resultados y bloquea la fecha</span>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Tipo
              <select value={tipoCierre} onChange={(e) => setTipoCierre(e.target.value as any)} style={{ ...inputStyle, width: "auto" }}>
                <option value="Mensual">Mensual</option>
                <option value="Anual">Anual</option>
              </select>
            </label>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Período
              <input type="month" value={periodoCierre} onChange={(e) => setPeriodoCierre(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
            </label>
            <button onClick={cerrarPeriodo} className={styles.seedBtn} style={{ height: 38, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuLock size={16} /> Cerrar {tipoCierre === "Anual" ? periodoCierre.slice(0, 4) : periodoCierre}</button>
          </div>
          {cierresPeriodo.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {cierresPeriodo.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.85rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.4rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><strong>{c.periodo}</strong> <span style={{ fontSize: "0.72rem", background: "#e0e7ff", color: "#3730a3", borderRadius: 20, padding: "1px 8px" }}>{c.tipo}</span> {c.cerrado ? <LuLock size={14} /> : <LuLockOpen size={14} />}</span>
                  <span style={{ color: "#64748b" }}>Utilidad: {fmtCRC(c.utilidad_neta)}</span>
                  {c.cerrado && <button onClick={() => reabrirPeriodo(c.periodo)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem", color: "#64748b" }}>Reabrir</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist de cierre */}
        {checklist && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <strong style={{ fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuClipboardList size={16} /> Checklist de Cierre</strong>
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, borderRadius: 8, padding: "2px 10px",
                background: checklist.listoParaCerrar ? "#dcfce7" : "#fef3c7",
                color: checklist.listoParaCerrar ? "#15803d" : "#92400e",
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
              }}>
                {checklist.listoParaCerrar ? <><LuCircleCheck size={14} /> Listo para cerrar</> : <><LuTriangleAlert size={14} /> {checklist.alertas} pendiente(s)</>}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {checklist.items.map((it: any) => (
                <div key={it.clave} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.88rem" }}>
                  <span>{it.estado === "ok" ? <LuCircleCheck size={16} /> : it.estado === "alerta" ? <LuTriangleAlert size={16} /> : <LuInfo size={16} />}</span>
                  <div>
                    <strong style={{ color: it.estado === "alerta" ? "#b45309" : "#334155" }}>{it.titulo}</strong>
                    <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{it.detalle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={styles.cierresGrid}>
          {cierres.length === 0 && <p className={styles.empty}>No hay cierres registrados.</p>}
          {cierres.map(c => (
            <div key={c.id} className={styles.cierreCard}>
              <div className={styles.cierreCardHeader}>
                <strong>{fmtFecha(c.fecha)}</strong>
                <span className={`${styles.estadoBadge} ${c.cerrado ? styles.estadoOk : styles.estadoPend}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  {c.cerrado ? <><LuLock size={13} /> Cerrado</> : <><LuHourglass size={13} /> Abierto</>}
                </span>
              </div>
              <div className={styles.cierreStats}>
                <div><span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuWallet size={13} /> Ingresos</span><strong className={styles.positive}>{fmtCRC(c.total_ingresos)}</strong></div>
                <div><span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuBanknote size={13} /> Gastos</span><strong className={styles.negative}>{fmtCRC(c.total_gastos)}</strong></div>
                <div><span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuTrendingUp size={13} /> Utilidad</span><strong className={c.utilidad_neta >= 0 ? styles.positive : styles.negative}>{fmtCRC(c.utilidad_neta)}</strong></div>
                {c.ventas_vehiculos > 0 && <div><span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuCar size={13} /> Vehículos</span><strong>{fmtCRC(c.ventas_vehiculos)}</strong></div>}
                {c.ventas_productos > 0 && <div><span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuPackage size={13} /> Repuestos</span><strong>{fmtCRC(c.ventas_productos)}</strong></div>}
                <div><span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuNotebookPen size={13} /> Asientos</span><strong>{c.num_transacciones}</strong></div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* ══ TAB: Plan de Cuentas ════════════════════════════════════════════ */}
      {tab === "cuentas" && (
        <>
          <div className={styles.topBar}>
            {cuentas.length === 0
              ? <button className={styles.seedBtn} onClick={seedCuentas} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuSettings size={16} /> Inicializar Plan de Cuentas</button>
              : <button className={styles.newBtn} onClick={() => setShowCuentaForm(!showCuentaForm)}>+ Nueva Cuenta</button>
            }
          </div>

          {showCuentaForm && (
            <form onSubmit={handleGuardarCuenta} className={styles.cuentaForm}>
              <div className={styles.formGrid4}>
                <div className={styles.field}><label>Código *</label>
                  <input value={cuentaForm.codigo} onChange={e => setCuentaForm(f => ({ ...f, codigo: e.target.value }))} placeholder="ej: 1150" required /></div>
                <div className={styles.field}><label>Nombre *</label>
                  <input value={cuentaForm.nombre} onChange={e => setCuentaForm(f => ({ ...f, nombre: e.target.value }))} required /></div>
                <div className={styles.field}><label>Tipo *</label>
                  <select value={cuentaForm.tipo} onChange={e => setCuentaForm(f => ({ ...f, tipo: e.target.value }))}>
                    {["Activo","Pasivo","Patrimonio","Ingreso","Gasto"].map(t => <option key={t}>{t}</option>)}
                  </select></div>
                <div className={styles.field}><label>Descripción</label>
                  <input value={cuentaForm.descripcion} onChange={e => setCuentaForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-principal" disabled={savingCuenta}>{savingCuenta ? "..." : "Crear Cuenta"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCuentaForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {["Activo","Pasivo","Patrimonio","Ingreso","Gasto"].map(tipo => {
            const grupo = cuentas.filter(c => c.tipo === tipo);
            if (!grupo.length) return null;
            return (
              <div key={tipo} className={styles.cuentasGrupo}>
                <div className={styles.cuentasGrupoHeader} style={{ background: TIPO_CUENTA_COLORS[tipo] }}>
                  {tipo} ({grupo.length})
                </div>
                {grupo.map(c => (
                  <div key={c.id} className={`${styles.cuentaRow} ${!c.activa ? styles.inactive : ""}`}>
                    <span className={styles.cuentaCodigo}>{c.codigo}</span>
                    <span className={styles.cuentaNombre}>{c.nombre}</span>
                    <span className={`${styles.movBadge} ${c.acepta_movimientos ? styles.movSi : styles.movNo}`}>
                      {c.acepta_movimientos ? "Acepta movimientos" : "Grupo"}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

// ── Sub-componentes ───────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) => (
  <div className={styles.kpiCard} style={{ "--c": color } as any}>
    <span className={styles.kpiIcon}>{icon}</span>
    <div><span className={styles.kpiVal}>{value}</span><span className={styles.kpiLbl}>{label}</span></div>
  </div>
);

const fmtCRC2 = (v: number) => (v < 0 ? "−" : "") + "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.abs(v));

const AsientosTable = ({ asientos }: { asientos: Asiento[] }) => (
  <div className={styles.asientosTable}>
    {asientos.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>Sin asientos en el período seleccionado.</p>}
    {asientos.map(a => (
      <details key={a.id} className={styles.asientoCard}>
        <summary className={styles.asientoSummary}>
          <span className={styles.asientoTipo} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>{(() => { const Icon = TIPO_ICONS[a.tipo] ?? LuNotebookPen; return <Icon size={14} />; })()} {a.tipo.replace("_", " ")}</span>
          <span className={styles.asientoDesc}>{a.descripcion}</span>
          <span className={styles.asientoFecha}>{fmtFecha(a.fecha)}</span>
          <span className={styles.asientoMonto}>
            {fmtCRC2(a.lineas.filter(l => Number(l.debe) > 0).reduce((s, l) => s + Number(l.debe), 0))}
          </span>
        </summary>
        <div className={styles.asientoLineas}>
          <div className={styles.asientoLineasHeader}><span>Cuenta</span><span>Descripción</span><span>Debe</span><span>Haber</span></div>
          {a.lineas.map(l => (
            <div key={l.id} className={styles.asientoLinea}>
              <span className={styles.cuentaCodigo}>{l.cuenta.codigo} — {l.cuenta.nombre}</span>
              <span className={styles.sub}>{l.descripcion ?? ""}</span>
              <span className={Number(l.debe)  > 0 ? styles.debe  : styles.sub}>{Number(l.debe)  > 0 ? fmtCRC2(Number(l.debe))  : "—"}</span>
              <span className={Number(l.haber) > 0 ? styles.haber : styles.sub}>{Number(l.haber) > 0 ? fmtCRC2(Number(l.haber)) : "—"}</span>
            </div>
          ))}
          {a.creado_por && <div className={styles.asientoAutor}>Por {a.creado_por.nombre_completo}</div>}
        </div>
      </details>
    ))}
  </div>
);
