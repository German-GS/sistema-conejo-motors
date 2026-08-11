import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./CxPPage.module.css";
import { LuPlus, LuDollarSign, LuTriangleAlert, LuChartColumnStacked } from "react-icons/lu";
import { exportToExcel } from "@/utils/exportExcel";

interface CxP {
  id: number; numero: string; concepto: string; factura_proveedor?: string;
  monto_original: number; saldo_pendiente: number; fecha_vencimiento: string; estado: string;
  proveedor?: { nombre: string };
}

const estadoColor: Record<string, string> = {
  Pendiente: 'var(--warning)', 'Pagado Parcial': '#3b82f6', Pagado: '#10b981', Vencido: '#ef4444', Anulado: 'var(--slate-400)',
};

export default function CxPPage() {
  const [lista, setLista] = useState<CxP[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState<number | null>(null);
  const [form, setForm] = useState({ concepto: '', factura_proveedor: '', monto_original: '', fecha_vencimiento: '', fecha_factura: '', notas: '', moneda: 'CRC', tipo_cambio: '' });
  const [pagoForm, setPagoForm] = useState({ monto: '', fecha: new Date().toISOString().split('T')[0], referencia: '', metodo_pago: 'Transferencia' });

  const cargar = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([apiClient.get("/cxp"), apiClient.get("/cxp/resumen")]);
    setLista(r1.data); setResumen(r2.data); setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.concepto || !form.monto_original || !form.fecha_vencimiento) return toast.error("Complete los campos requeridos");
    const esUsd = form.moneda === 'USD';
    const tc = esUsd ? Number(form.tipo_cambio) : 1;
    if (esUsd && (!tc || tc <= 0)) return toast.error("Ingresá el tipo de cambio para USD");
    // El mayor se lleva en CRC: si es USD, el monto ingresado (USD) se convierte con el TC.
    const montoCRC = esUsd ? +(Number(form.monto_original) * tc).toFixed(2) : +form.monto_original;
    await apiClient.post("/cxp", { ...form, monto_original: montoCRC, moneda: form.moneda, tipo_cambio: tc });
    setShowModal(false); cargar();
  };

  const registrarPago = async () => {
    if (!pagoForm.monto || !showPagoModal) return;
    await apiClient.post(`/cxp/${showPagoModal}/pago`, { ...pagoForm, monto: +pagoForm.monto });
    setShowPagoModal(null); cargar();
  };

  const exportar = () => exportToExcel(
    lista.map(c => ({
      Número: c.numero, Proveedor: c.proveedor?.nombre || "", Concepto: c.concepto,
      "Factura proveedor": c.factura_proveedor || "", "Monto original": c.monto_original,
      "Saldo pendiente": c.saldo_pendiente, Vencimiento: c.fecha_vencimiento, Estado: c.estado,
    })),
    "CuentasPorPagar", "CxP",
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Cuentas por Pagar</h1><p>Control de pagos a proveedores</p></div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={styles.btnPrimary} style={{ background: "#fff", color: "var(--slate-700)", border: "1px solid var(--slate-300)", display: "inline-flex", alignItems: "center", gap: "0.4rem" }} onClick={exportar}><LuChartColumnStacked size={16} /> Excel</button>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nueva CxP</button>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpiCard}><LuDollarSign size={24} className={styles.kpiIcon} /><div><div className={styles.kpiVal}>₡{resumen.totalPendiente?.toLocaleString('es-CR') || 0}</div><div className={styles.kpiLabel}>Total por Pagar</div></div></div>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}><LuTriangleAlert size={24} className={styles.kpiIcon} /><div><div className={styles.kpiVal}>{resumen.vencidas || 0}</div><div className={styles.kpiLabel}>Pagos Vencidos</div></div></div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className={styles.tabla}>
          <div className={styles.tablaHeader}><span>Número</span><span>Proveedor / Concepto</span><span>Factura</span><span>Monto</span><span>Saldo</span><span>Vencimiento</span><span>Estado</span><span></span></div>
          {lista.map(c => (
            <div key={c.id} className={styles.tablaRow}>
              <span className={styles.numero}>{c.numero}</span>
              <div><div className={styles.bold}>{c.proveedor?.nombre || '-'}</div><div className={styles.sub}>{c.concepto}</div></div>
              <span>{c.factura_proveedor || '-'}</span>
              <span>₡{(+c.monto_original).toLocaleString('es-CR')}</span>
              <span className={styles.bold}>₡{(+c.saldo_pendiente).toLocaleString('es-CR')}</span>
              <span>{new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CR')}</span>
              <span><span className={styles.badge} style={{ background: estadoColor[c.estado]+'22', color: estadoColor[c.estado] }}>{c.estado}</span></span>
              <span>{!['Pagado','Anulado'].includes(c.estado) && <button className={styles.btnPay} onClick={() => setShowPagoModal(c.id)}>Pagar</button>}</span>
            </div>
          ))}
          {lista.length === 0 && <p className={styles.empty}>No hay cuentas por pagar</p>}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Cuenta por Pagar</h2>
            <div className={styles.fg}><label>Concepto *</label><input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} /></div>
            <div className={styles.fg}><label>N° Factura Proveedor</label><input value={form.factura_proveedor} onChange={e => setForm({...form, factura_proveedor: e.target.value})} /></div>
            <div className={styles.fg}><label>Moneda</label>
              <select value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})}>
                <option value="CRC">Colones (CRC)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div className={styles.fg}><label>Monto * {form.moneda === 'USD' ? '(en USD)' : '(en CRC)'}</label><input type="number" value={form.monto_original} onChange={e => setForm({...form, monto_original: e.target.value})} /></div>
            {form.moneda === 'USD' && (
              <div className={styles.fg}><label>Tipo de cambio *</label><input type="number" step="0.01" placeholder="₡ por USD" value={form.tipo_cambio} onChange={e => setForm({...form, tipo_cambio: e.target.value})} /></div>
            )}
            <div className={styles.fg}><label>Vencimiento *</label><input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} /></div>
            <div className={styles.actions}><button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={guardar}>Guardar</button></div>
          </div>
        </div>
      )}

      {showPagoModal && (
        <div className={styles.overlay} onClick={() => setShowPagoModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Registrar Pago</h2>
            <div className={styles.fg}><label>Monto *</label><input type="number" value={pagoForm.monto} onChange={e => setPagoForm({...pagoForm, monto: e.target.value})} /></div>
            <div className={styles.fg}><label>Fecha *</label><input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({...pagoForm, fecha: e.target.value})} /></div>
            <div className={styles.fg}><label>Método</label><select value={pagoForm.metodo_pago} onChange={e => setPagoForm({...pagoForm, metodo_pago: e.target.value})}>{['Efectivo','SINPE','Transferencia','Cheque'].map(m=><option key={m}>{m}</option>)}</select></div>
            <div className={styles.fg}><label>Referencia</label><input value={pagoForm.referencia} onChange={e => setPagoForm({...pagoForm, referencia: e.target.value})} /></div>
            <div className={styles.actions}><button className={styles.btnSecondary} onClick={() => setShowPagoModal(null)}>Cancelar</button><button className={styles.btnPrimary} onClick={registrarPago}>Registrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
