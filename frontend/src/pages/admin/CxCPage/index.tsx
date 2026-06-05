import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./CxCPage.module.css";
import { LuPlus, LuDollarSign, LuTriangleAlert } from "react-icons/lu";

interface CxC {
  id: number; numero: string; concepto: string; tipo: string;
  monto_original: number; monto_pagado: number; saldo_pendiente: number;
  fecha_vencimiento: string; estado: string;
  cliente?: { nombre_completo: string };
}

const estadoColor: Record<string, string> = {
  Pendiente: '#f59e0b', 'Pagado Parcial': '#3b82f6', Pagado: '#10b981', Vencido: '#ef4444', Anulado: '#94a3b8',
};

export default function CxCPage() {
  const [lista, setLista] = useState<CxC[]>([]);
  const [resumen, setResumen] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState<number | null>(null);
  const [form, setForm] = useState({ concepto: '', tipo: 'Venta Vehiculo', monto_original: '', fecha_vencimiento: '', fecha_emision: '', notas: '' });
  const [pagoForm, setPagoForm] = useState({ monto: '', fecha: new Date().toISOString().split('T')[0], referencia: '', metodo_pago: 'Transferencia', notas: '' });

  const cargar = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([apiClient.get("/cxc"), apiClient.get("/cxc/resumen")]);
    setLista(r1.data); setResumen(r2.data); setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.concepto || !form.monto_original || !form.fecha_vencimiento) return alert("Complete los campos requeridos");
    await apiClient.post("/cxc", { ...form, monto_original: +form.monto_original });
    setShowModal(false); cargar();
  };

  const registrarPago = async () => {
    if (!pagoForm.monto || !showPagoModal) return;
    await apiClient.post(`/cxc/${showPagoModal}/pago`, { ...pagoForm, monto: +pagoForm.monto });
    setShowPagoModal(null); cargar();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Cuentas por Cobrar</h1><p>Control de créditos y pagos pendientes</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nueva CxC</button>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpiCard}><LuDollarSign size={24} className={styles.kpiIcon} /><div><div className={styles.kpiVal}>₡{resumen.totalPendiente?.toLocaleString('es-CR') || 0}</div><div className={styles.kpiLabel}>Saldo Pendiente</div></div></div>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}><LuTriangleAlert size={24} className={styles.kpiIcon} /><div><div className={styles.kpiVal}>{resumen.vencidas || 0}</div><div className={styles.kpiLabel}>Facturas Vencidas</div></div></div>
        <div className={styles.kpiCard}><div><div className={styles.kpiVal}>{resumen.total || 0}</div><div className={styles.kpiLabel}>Total Cuentas</div></div></div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className={styles.tabla}>
          <div className={styles.tablaHeader}><span>Número</span><span>Cliente / Concepto</span><span>Tipo</span><span>Original</span><span>Saldo</span><span>Vencimiento</span><span>Estado</span><span></span></div>
          {lista.map(c => (
            <div key={c.id} className={styles.tablaRow}>
              <span className={styles.numero}>{c.numero}</span>
              <div><div className={styles.concepto}>{c.cliente?.nombre_completo || '-'}</div><div className={styles.subText}>{c.concepto}</div></div>
              <span>{c.tipo}</span>
              <span>₡{(+c.monto_original).toLocaleString('es-CR')}</span>
              <span className={styles.saldo}>₡{(+c.saldo_pendiente).toLocaleString('es-CR')}</span>
              <span>{new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-CR')}</span>
              <span><span className={styles.estadoBadge} style={{ background: estadoColor[c.estado] + '22', color: estadoColor[c.estado] }}>{c.estado}</span></span>
              <span>{!['Pagado','Anulado'].includes(c.estado) && <button className={styles.btnPay} onClick={() => setShowPagoModal(c.id)}>Registrar Pago</button>}</span>
            </div>
          ))}
          {lista.length === 0 && <p className={styles.empty}>No hay cuentas por cobrar</p>}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Cuenta por Cobrar</h2>
            <div className={styles.formGrid}>
              <div className={styles.fg}><label>Concepto *</label><input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} /></div>
              <div className={styles.fg}><label>Tipo</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>{['Venta Vehiculo','Venta Repuesto','Servicio','Financiamiento','Otro'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div className={styles.fg}><label>Monto *</label><input type="number" value={form.monto_original} onChange={e => setForm({...form, monto_original: e.target.value})} /></div>
              <div className={styles.fg}><label>Fecha Emisión</label><input type="date" value={form.fecha_emision} onChange={e => setForm({...form, fecha_emision: e.target.value})} /></div>
              <div className={styles.fg}><label>Vencimiento *</label><input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} /></div>
              <div className={`${styles.fg} ${styles.full}`}><label>Notas</label><textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2} /></div>
            </div>
            <div className={styles.actions}><button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={guardar}>Guardar</button></div>
          </div>
        </div>
      )}

      {showPagoModal && (
        <div className={styles.overlay} onClick={() => setShowPagoModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Registrar Pago</h2>
            <div className={styles.formGrid}>
              <div className={styles.fg}><label>Monto *</label><input type="number" value={pagoForm.monto} onChange={e => setPagoForm({...pagoForm, monto: e.target.value})} /></div>
              <div className={styles.fg}><label>Fecha *</label><input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({...pagoForm, fecha: e.target.value})} /></div>
              <div className={styles.fg}><label>Método</label><select value={pagoForm.metodo_pago} onChange={e => setPagoForm({...pagoForm, metodo_pago: e.target.value})}>{['Efectivo','SINPE','Transferencia','Cheque'].map(m=><option key={m}>{m}</option>)}</select></div>
              <div className={styles.fg}><label>Referencia</label><input value={pagoForm.referencia} onChange={e => setPagoForm({...pagoForm, referencia: e.target.value})} /></div>
            </div>
            <div className={styles.actions}><button className={styles.btnSecondary} onClick={() => setShowPagoModal(null)}>Cancelar</button><button className={styles.btnPrimary} onClick={registrarPago}>Registrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
