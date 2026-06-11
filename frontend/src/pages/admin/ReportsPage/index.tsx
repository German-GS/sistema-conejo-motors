import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card";
import toast from "react-hot-toast";
import styles from "./ReportsPage.module.css";
import * as XLSX from "xlsx";

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type ReportType =
  | "profit"
  | "sales-by-seller"
  | "sales-by-vehicle"
  | "detailed-sales"
  | "leads-by-seller"
  | "most-quoted"
  | "inventory"
  | "payroll";

const reportOptions: { value: ReportType; label: string; icon: string; needsDates: boolean }[] = [
  { value: "profit",           label: "Ganancias del Período",      icon: "💰", needsDates: true  },
  { value: "sales-by-seller",  label: "Ventas por Vendedor",         icon: "🏆", needsDates: true  },
  { value: "sales-by-vehicle", label: "Ventas por Vehículo",         icon: "🚗", needsDates: true  },
  { value: "detailed-sales",   label: "Listado General de Ventas",   icon: "📋", needsDates: true  },
  { value: "leads-by-seller",  label: "Leads por Vendedor",          icon: "👥", needsDates: true  },
  { value: "most-quoted",      label: "Vehículos Más Cotizados",     icon: "📊", needsDates: true  },
  { value: "inventory",        label: "Inventario Actual",           icon: "📦", needsDates: false },
  { value: "payroll",          label: "Informe de Planilla",         icon: "💼", needsDates: true  },
];

const fmtCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

// Mini barra de progreso para comparar filas
const Bar = ({ value, max, color = "#024f7d" }: { value: number; max: number; color?: string }) => (
  <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8, width: "100%", minWidth: 80 }}>
    <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.3s" }} />
  </div>
);

export const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>("profit");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cierres, setCierres] = useState<any[]>([]);
  const [loadingCierres, setLoadingCierres] = useState(true);

  const selectedOpt = reportOptions.find(o => o.value === reportType)!;

  useEffect(() => {
    apiClient.get("/reports/cierre-mes")
      .then(r => setCierres(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingCierres(false));
  }, []);

  const handleDescargarCierre = async (id: number, mes: number, anio: number) => {
    try {
      const res = await apiClient.get(`/reports/cierre-mes/${id}/excel`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cierre-${MESES[mes]}-${anio}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el informe.");
    }
  };

  const handleGenerate = async () => {
    if (selectedOpt.needsDates && (!startDate || !endDate)) {
      toast.error("Por favor, selecciona un rango de fechas.");
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      const res = await apiClient.get("/reports/summary", {
        params: { type: reportType, startDate, endDate },
      });
      setReportData(res.data);
    } catch {
      toast.error("Error al generar el informe.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData || (Array.isArray(reportData) && !reportData.length)) {
      toast.error("No hay datos para exportar."); return;
    }
    let rows: any[] = [];
    switch (reportType) {
      case "profit":
        rows = [{ "Total Ventas": reportData.totalVentas, "Costo": reportData.totalCosto, "Ganancia": reportData.gananciaBruta }]; break;
      case "inventory":
        rows = reportData.vehicles.map((v: any) => ({ ID: v.id, Marca: v.marca, Modelo: v.modelo, Año: v.año, VIN: v.vin, "Costo CRC": v.precio_costo })); break;
      case "payroll":
        rows = reportData.map((r: any) => ({ Nombre: r.nombre_completo, Cédula: r.cedula, Banco: r.banco, Cuenta: r.numero_cuenta, Monto: r.monto_deposito })); break;
      default:
        rows = reportData;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Informe");
    XLSX.writeFile(wb, `Informe_${reportType}_${new Date().toLocaleDateString("es-CR")}.xlsx`);
  };

  const renderReport = () => {
    if (loading) return <div className={styles.loading}>⏳ Generando informe...</div>;
    if (!reportData) return <div className={styles.empty}>Selecciona el tipo de informe y el período, luego haz clic en Generar.</div>;
    if (Array.isArray(reportData) && !reportData.length)
      return <div className={styles.empty}>No se encontraron resultados para ese período.</div>;

    switch (reportType) {

      // ── GANANCIAS ───────────────────────────────────────────────
      case "profit": {
        const { totalVentas = 0, totalCosto = 0, gananciaBruta = 0 } = reportData;
        const margen = totalVentas > 0 ? ((gananciaBruta / totalVentas) * 100).toFixed(1) : "0";
        return (
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>💰</span>
              <span className={styles.kpiNum}>{fmtCRC(totalVentas)}</span>
              <span className={styles.kpiLabel}>Total Vendido</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>📦</span>
              <span className={styles.kpiNum}>{fmtCRC(totalCosto)}</span>
              <span className={styles.kpiLabel}>Costo Inventario</span>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
              <span className={styles.kpiIcon}>📈</span>
              <span className={styles.kpiNum}>{fmtCRC(gananciaBruta)}</span>
              <span className={styles.kpiLabel}>Ganancia Bruta</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>%</span>
              <span className={styles.kpiNum}>{margen}%</span>
              <span className={styles.kpiLabel}>Margen Bruto</span>
            </div>
          </div>
        );
      }

      // ── VENTAS POR VENDEDOR ─────────────────────────────────────
      case "sales-by-seller": {
        const maxVendido = Math.max(...reportData.map((r: any) => Number(r.totalvendido)));
        return (
          <table className={styles.reportTable}>
            <thead><tr><th>Vendedor</th><th>Unidades</th><th>Total Vendido</th><th style={{width:120}}></th></tr></thead>
            <tbody>
              {reportData.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.vendedor}</td>
                  <td><strong>{r.unidadesvendidas}</strong></td>
                  <td>{fmtCRC(Number(r.totalvendido))}</td>
                  <td><Bar value={Number(r.totalvendido)} max={maxVendido} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      // ── VENTAS POR VEHÍCULO ─────────────────────────────────────
      case "sales-by-vehicle": {
        const maxV = Math.max(...reportData.map((r: any) => Number(r.totalvendido)));
        return (
          <table className={styles.reportTable}>
            <thead><tr><th>Vehículo</th><th>Unidades</th><th>Total Vendido</th><th style={{width:120}}></th></tr></thead>
            <tbody>
              {reportData.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.vehiculo}</td>
                  <td><strong>{r.unidadesvendidas}</strong></td>
                  <td>{fmtCRC(Number(r.totalvendido))}</td>
                  <td><Bar value={Number(r.totalvendido)} max={maxV} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      // ── VENTAS DETALLADAS ───────────────────────────────────────
      case "detailed-sales":
        return (
          <table className={styles.reportTable}>
            <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Vehículo</th><th>Vendedor</th><th>Monto</th></tr></thead>
            <tbody>
              {reportData.map((v: any) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{new Date(v.fecha_venta).toLocaleDateString("es-CR")}</td>
                  <td>{v.cotizacion?.cliente?.nombre_completo}</td>
                  <td>{v.cotizacion?.vehiculo ? `${v.cotizacion.vehiculo.marca} ${v.cotizacion.vehiculo.modelo}` : "—"}</td>
                  <td>{v.vendedor?.nombre_completo}</td>
                  <td>{fmtCRC(Number(v.monto_final))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      // ── LEADS POR VENDEDOR ──────────────────────────────────────
      case "leads-by-seller": {
        const maxLeads = Math.max(...reportData.map((r: any) => Number(r.total)));
        return (
          <table className={styles.reportTable}>
            <thead>
              <tr><th>Vendedor</th><th>Total</th><th>Activos</th><th>Cerrados</th><th>Perdidos</th><th>Conversión</th><th style={{width:120}}></th></tr>
            </thead>
            <tbody>
              {reportData.map((r: any, i: number) => {
                const conv = Number(r.total) > 0 ? ((Number(r.cerrados) / Number(r.total)) * 100).toFixed(0) : "0";
                return (
                  <tr key={i}>
                    <td>{r.vendedor}</td>
                    <td><strong>{r.total}</strong></td>
                    <td><span className={styles.badgeBlue}>{r.activos}</span></td>
                    <td><span className={styles.badgeGreen}>{r.cerrados}</span></td>
                    <td><span className={styles.badgeRed}>{r.perdidos}</span></td>
                    <td><strong>{conv}%</strong></td>
                    <td><Bar value={Number(r.total)} max={maxLeads} color="#8b5cf6" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      }

      // ── VEHÍCULOS MÁS COTIZADOS ─────────────────────────────────
      case "most-quoted": {
        const maxCot = Math.max(...reportData.map((r: any) => Number(r.cotizaciones)));
        return (
          <table className={styles.reportTable}>
            <thead><tr><th>#</th><th>Vehículo</th><th>Cotizaciones</th><th>Monto Total</th><th style={{width:120}}></th></tr></thead>
            <tbody>
              {reportData.map((r: any, i: number) => (
                <tr key={i}>
                  <td className={i < 3 ? styles.rankTop : ""}>{i + 1}</td>
                  <td>{r.vehiculo}</td>
                  <td><strong>{r.cotizaciones}</strong></td>
                  <td>{fmtCRC(Number(r.monto_total))}</td>
                  <td><Bar value={Number(r.cotizaciones)} max={maxCot} color="#f59e0b" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }

      // ── INVENTARIO ──────────────────────────────────────────────
      case "inventory":
        if (!Array.isArray(reportData?.vehicles)) return null;
        return (
          <>
            <div className={styles.kpiRow}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiIcon}>🚗</span>
                <span className={styles.kpiNum}>{reportData.totalVehicles}</span>
                <span className={styles.kpiLabel}>Vehículos en Stock</span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiIcon}>💰</span>
                <span className={styles.kpiNum}>{fmtCRC(Number(reportData.inventoryCost))}</span>
                <span className={styles.kpiLabel}>Costo Total Inventario</span>
              </div>
            </div>
            <table className={styles.reportTable}>
              <thead>
                <tr><th>ID</th><th>Marca</th><th>Modelo</th><th>Año</th><th>Color</th><th>VIN</th><th>Cuenta</th><th>Costo USD</th><th>T/C</th><th>Tasa Caldera</th><th>Acarreo</th><th>Nac.</th><th>Inscripción</th><th>Marchamo</th><th>Costo CRC</th><th>Ubicación</th></tr>
              </thead>
              <tbody>
                {reportData.vehicles.map((v: any) => (
                  <tr key={v.id}>
                    <td>{v.id}</td><td>{v.marca}</td><td>{v.modelo}</td><td>{v.año}</td>
                    <td>{v.color}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{v.vin}</td>
                    <td>{v.cuenta_contable || "1030"}</td>
                    <td>${Number(v.costo_factura_usd || 0).toLocaleString("es-CR")}</td>
                    <td>₡{Number(v.tipo_cambio || 0).toLocaleString("es-CR")}</td>
                    <td>₡{Number(v.tasa_caldera || 0).toLocaleString("es-CR")}</td>
                    <td>₡{Number(v.acarreo || 0).toLocaleString("es-CR")}</td>
                    <td>₡{Number(v.costo_nacionalizacion || 0).toLocaleString("es-CR")}</td>
                    <td>₡{Number(v.inscripcion_traspaso || 0).toLocaleString("es-CR")}</td>
                    <td>₡{Number(v.marchamo || 0).toLocaleString("es-CR")}</td>
                    <td><strong>₡{Number(v.precio_costo).toLocaleString("es-CR")}</strong></td>
                    <td>{v.bodega?.nombre || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );

      // ── PLANILLA ────────────────────────────────────────────────
      case "payroll":
        return (
          <table className={styles.reportTable}>
            <thead><tr><th>Nombre</th><th>Cédula</th><th>Banco</th><th>Cuenta</th><th>Monto</th></tr></thead>
            <tbody>
              {reportData.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.nombre_completo}</td><td>{r.cedula}</td>
                  <td>{r.banco}</td><td>{r.numero_cuenta}</td>
                  <td>{fmtCRC(Number(r.monto_deposito))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return <p>Selecciona un tipo de informe válido.</p>;
    }
  };

  return (
    <div>
      {/* ── Selector de tipo ── */}
      <div className={styles.typeGrid}>
        {reportOptions.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.typeBtn} ${reportType === opt.value ? styles.typeBtnActive : ""}`}
            onClick={() => { setReportType(opt.value); setReportData(null); }}
          >
            <span className={styles.typeIcon}>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* ── Controles de fecha ── */}
      <Card title={`${selectedOpt.icon} ${selectedOpt.label}`}>
        <div className={styles.controls}>
          {selectedOpt.needsDates && (
            <>
              <div className={styles.dateField}>
                <label>Desde</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className={styles.dateField}>
                <label>Hasta</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          <button className="btn btn-principal" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generando..." : "▶ Generar Informe"}
          </button>
          <button className="btn btn-secondary" onClick={handleExport} disabled={!reportData}>
            📥 Exportar Excel
          </button>
        </div>
      </Card>

      {/* ── Resultados ── */}
      <Card title="Resultados">
        {renderReport()}
      </Card>

      {/* ── Historial de Cierres de Mes ── */}
      <Card title="📁 Historial de Cierres de Mes">
        {loadingCierres ? (
          <p style={{ color: "#94a3b8", padding: "1rem" }}>Cargando...</p>
        ) : cierres.length === 0 ? (
          <p style={{ color: "#94a3b8", padding: "1rem" }}>
            Aún no hay cierres de mes registrados. Usa el botón "Cerrar Mes" en el dashboard.
          </p>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ventas</th>
                <th>Ingresos</th>
                <th>Leads perdidos</th>
                <th>Cerrado por</th>
                <th>Fecha cierre</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cierres.map((c: any) => (
                <tr key={c.id}>
                  <td><strong>{MESES[c.mes]} {c.anio}</strong></td>
                  <td>{c.snapshot?.ventas?.cantidad ?? 0} vehículos</td>
                  <td>₡ {new Intl.NumberFormat("es-CR").format(c.snapshot?.ventas?.ingresos ?? 0)}</td>
                  <td>{c.snapshot?.leads?.perdidos ?? 0} leads</td>
                  <td>{c.cerrado_por?.nombre_completo ?? "—"}</td>
                  <td>{new Date(c.fecha_cierre).toLocaleDateString("es-CR")}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                      onClick={() => handleDescargarCierre(c.id, c.mes, c.anio)}
                    >
                      📥 Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
