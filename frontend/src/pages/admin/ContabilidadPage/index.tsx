import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./ContabilidadPage.module.css";
import { fmtFecha, hoyEnCR } from "@/utils/dateUtils";

interface Cuenta { id: number; codigo: string; nombre: string; tipo: string; acepta_movimientos: boolean; activa: boolean; }
interface LineaAsiento { id: number; cuenta: Cuenta; debe: number; haber: number; descripcion?: string; }
interface Asiento { id: number; fecha: string; descripcion: string; tipo: string; lineas: LineaAsiento[]; creado_por?: { nombre_completo: string }; }
interface CierreDiario { id: number; fecha: string; total_ingresos: number; total_gastos: number; utilidad_neta: number; ventas_vehiculos: number; ventas_productos: number; num_transacciones: number; cerrado: boolean; }
interface Balance { cuentas: Record<string, { id: number; codigo: string; nombre: string; tipo: string; saldo: number }[]>; totales: any; equilibrado: boolean; }

const fmtCRC = (v: number) => (v < 0 ? "−" : "") + "₡ " + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.abs(v));

const TIPO_ICONS: Record<string, string> = {
  Venta_Vehiculo: "🚗", Venta_Producto: "📦", Compra: "🛒",
  Gasto: "💸", Ingreso: "💰", Ajuste: "⚖️", Cierre: "🔒", Manual: "✏️",
};

const TIPO_CUENTA_COLORS: Record<string, string> = {
  Activo: "#0891b2", Pasivo: "#dc2626", Patrimonio: "#7c3aed",
  Ingreso: "#059669", Gasto: "#d97706",
};

const inputStyle: CSSProperties = { display: "block", width: "100%", marginTop: 4, padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" };
const thStyle: CSSProperties = { padding: "0.6rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" };
const tdStyle: CSSProperties = { padding: "0.55rem 0.8rem", color: "#334155" };

export const ContabilidadPage = () => {
  const [tab, setTab] = useState<"dashboard" | "cuentas" | "asientos" | "balance" | "cierres" | "activos">("dashboard");
  const [activos, setActivos] = useState<{ items: any[]; totales: any } | null>(null);
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

  useEffect(() => { if (tab === "activos") fetchActivos(); }, [tab, fetchActivos]);

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
        <h1>📊 Contabilidad</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {cuentas.length === 0 && (
            <button className={styles.seedBtn} onClick={seedCuentas}>
              ⚙️ Inicializar Plan de Cuentas Estándar
            </button>
          )}
          {cuentas.length > 0 && (
            <button className={styles.seedBtn} onClick={cargarInventarioInicial} title="Genera el asiento de apertura del inventario de vehículos en stock">
              🚗 Cargar inventario inicial
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {[
          { key: "dashboard", label: "📊 Resumen" },
          { key: "asientos",  label: "📝 Asientos" },
          { key: "balance",   label: "⚖️ Balance" },
          { key: "activos",   label: "🏢 Activos Fijos" },
          { key: "cierres",   label: "🔒 Cierres" },
          { key: "cuentas",   label: "📋 Plan de Cuentas" },
        ].map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: Dashboard ══════════════════════════════════════════════════ */}
      {tab === "dashboard" && preview && (
        <div>
          {/* ── Resumen del día ── */}
          <div className={styles.sectionTitle}>Resumen del Día — {fmtFecha(preview.fecha)}</div>
          <div className={styles.kpiRow}>
            <KpiCard icon="💰" label="Ingresos Hoy" value={fmtCRC(preview.ingresos)} color="#059669" />
            <KpiCard icon="💸" label="Gastos Hoy" value={fmtCRC(preview.gastos)} color="#dc2626" />
            <KpiCard icon="📈" label="Utilidad Hoy" value={fmtCRC(preview.utilidad)} color={preview.utilidad >= 0 ? "#0891b2" : "#dc2626"} />
            <KpiCard icon="📝" label="Asientos" value={String(preview.num_asientos)} color="#7c3aed" />
          </div>

          {(preview.ventas_vehiculos > 0 || preview.ventas_productos > 0) && (
            <div className={styles.ventasRow}>
              {preview.ventas_vehiculos > 0 && <div className={styles.ventaCard}><span>🚗 Ventas Vehículos</span><strong>{fmtCRC(preview.ventas_vehiculos)}</strong></div>}
              {preview.ventas_productos > 0 && <div className={styles.ventaCard}><span>📦 Ventas Repuestos</span><strong>{fmtCRC(preview.ventas_productos)}</strong></div>}
            </div>
          )}

          {/* Cierre del día */}
          <div className={styles.cierreBox}>
            {preview.ya_cerrado ? (
              <div className={styles.cierreOk}>🔒 El día de hoy ya fue cerrado.</div>
            ) : (
              <>
                <p className={styles.cierreHint}>El día aún no ha sido cerrado. Al cerrar, se consolida el balance del día.</p>
                <button className={styles.cierreBtn} onClick={handleCierre}>🔒 Realizar Cierre del Día</button>
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
                <KpiCard icon="💰" label="Ingresos MTD" value={fmtCRC(resumenMes.ingresos)} color="#059669" />
                <KpiCard icon="💸" label="Gastos MTD" value={fmtCRC(resumenMes.gastos)} color="#dc2626" />
                <KpiCard icon="📈" label="Utilidad MTD" value={fmtCRC(resumenMes.utilidad)} color={resumenMes.utilidad >= 0 ? "#0891b2" : "#dc2626"} />
                <KpiCard icon="📝" label="Asientos MTD" value={String(resumenMes.num_asientos)} color="#7c3aed" />
              </div>

              {/* Desglose de gastos del mes */}
              {resumenMes.gastos_por_tipo && Object.keys(resumenMes.gastos_por_tipo).length > 0 && (
                <div style={{ background: "var(--bg-card, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, padding: "1rem 1.25rem", marginTop: "1rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                    💸 Desglose de Gastos del Mes
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
                    {cuadrado ? " ✅ Cuadrado" : " ❌ No cuadra"}
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
            <div className={styles.equilibrioChip}>
              {balance.equilibrado ? "✅ Balance en equilibrio" : "⚠️ Balance desbalanceado — revisar asientos"}
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
              <KpiCard icon="🏢" label="Costo total" value={fmtCRC(activos.totales.costo)} color="#0891b2" />
              <KpiCard icon="📉" label="Depreciación acumulada" value={fmtCRC(activos.totales.depreciacion_acumulada)} color="#dc2626" />
              <KpiCard icon="💎" label="Valor neto en libros" value={fmtCRC(activos.totales.valor_neto)} color="#059669" />
            </div>
          )}

          {/* Formulario alta */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", margin: "1rem 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Nombre
              <input value={activoForm.nombre} onChange={(e) => setActivoForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Elevador de taller" style={inputStyle} />
            </label>
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
            <button onClick={crearActivo} disabled={savingActivo} className={styles.seedBtn} style={{ height: 38 }}>
              {savingActivo ? "Guardando…" : "➕ Registrar activo"}
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
                      {a.tipo === "Activo" && a.activo && (
                        <button onClick={() => darDeBajaActivo(a.id, a.nombre)} style={{ background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem" }}>Dar de baja</button>
                      )}
                      {a.tipo === "Vehículo Demo" && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>gestionar en vehículos</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            La depreciación se calcula automáticamente el día 1 de cada mes (línea recta). Los vehículos Demo se administran desde la sección de vehículos.
          </p>
        </>
      )}

      {/* ══ TAB: Cierres ════════════════════════════════════════════════════ */}
      {tab === "cierres" && (
        <>
        {/* Cierre de período con bloqueo */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "1rem" }}>🔒 Cierre de período</strong>
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
            <button onClick={cerrarPeriodo} className={styles.seedBtn} style={{ height: 38 }}>🔒 Cerrar {tipoCierre === "Anual" ? periodoCierre.slice(0, 4) : periodoCierre}</button>
          </div>
          {cierresPeriodo.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {cierresPeriodo.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.85rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.4rem" }}>
                  <span><strong>{c.periodo}</strong> <span style={{ fontSize: "0.72rem", background: "#e0e7ff", color: "#3730a3", borderRadius: 20, padding: "1px 8px" }}>{c.tipo}</span> {c.cerrado ? "🔒" : "🔓"}</span>
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
              <strong style={{ fontSize: "1rem" }}>📋 Checklist de Cierre</strong>
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, borderRadius: 8, padding: "2px 10px",
                background: checklist.listoParaCerrar ? "#dcfce7" : "#fef3c7",
                color: checklist.listoParaCerrar ? "#15803d" : "#92400e",
              }}>
                {checklist.listoParaCerrar ? "✅ Listo para cerrar" : `⚠️ ${checklist.alertas} pendiente(s)`}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {checklist.items.map((it: any) => (
                <div key={it.clave} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.88rem" }}>
                  <span>{it.estado === "ok" ? "✅" : it.estado === "alerta" ? "⚠️" : "ℹ️"}</span>
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
                <span className={`${styles.estadoBadge} ${c.cerrado ? styles.estadoOk : styles.estadoPend}`}>
                  {c.cerrado ? "🔒 Cerrado" : "⏳ Abierto"}
                </span>
              </div>
              <div className={styles.cierreStats}>
                <div><span>💰 Ingresos</span><strong className={styles.positive}>{fmtCRC(c.total_ingresos)}</strong></div>
                <div><span>💸 Gastos</span><strong className={styles.negative}>{fmtCRC(c.total_gastos)}</strong></div>
                <div><span>📈 Utilidad</span><strong className={c.utilidad_neta >= 0 ? styles.positive : styles.negative}>{fmtCRC(c.utilidad_neta)}</strong></div>
                {c.ventas_vehiculos > 0 && <div><span>🚗 Vehículos</span><strong>{fmtCRC(c.ventas_vehiculos)}</strong></div>}
                {c.ventas_productos > 0 && <div><span>📦 Repuestos</span><strong>{fmtCRC(c.ventas_productos)}</strong></div>}
                <div><span>📝 Asientos</span><strong>{c.num_transacciones}</strong></div>
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
              ? <button className={styles.seedBtn} onClick={seedCuentas}>⚙️ Inicializar Plan de Cuentas</button>
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
const KpiCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
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
          <span className={styles.asientoTipo}>{TIPO_ICONS[a.tipo] ?? "📝"} {a.tipo.replace("_", " ")}</span>
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
