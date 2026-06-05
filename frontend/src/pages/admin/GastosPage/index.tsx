import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./GastosPage.module.css";
import { LuPlus, LuReceipt } from "react-icons/lu";

interface Gasto { id: number; categoria: string; descripcion: string; monto: number; fecha: string; numero_factura?: string; proveedor?: { nombre: string }; }

const CATS = ['Salarios','Servicios Publicos','Publicidad','Combustible','Alquiler','Mantenimiento','Papeleria','Alimentacion','Transporte','Seguros','Impuestos','Otro'];

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ categoria: 'Otro', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], numero_factura: '', notas: '' });
  const [totalMes, setTotalMes] = useState(0);

  const cargar = async () => {
    setLoading(true);
    const r = await apiClient.get("/gastos");
    setGastos(r.data);
    const hoy = new Date(); const mes = hoy.getMonth(); const año = hoy.getFullYear();
    const total = r.data.filter((g: Gasto) => { const d = new Date(g.fecha + 'T00:00:00'); return d.getMonth() === mes && d.getFullYear() === año; }).reduce((a: number, g: Gasto) => a + +g.monto, 0);
    setTotalMes(total); setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.descripcion || !form.monto) return alert("Complete los campos");
    await apiClient.post("/gastos", { ...form, monto: +form.monto });
    setShowModal(false); cargar();
  };

  const f = (k: any) => (e: any) => setForm({...form, [k]: e.target.value});

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Gastos Operativos</h1><p>Control de gastos y costos de operación</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nuevo Gasto</button>
      </div>

      <div className={styles.kpiCard}>
        <LuReceipt size={24} className={styles.kpiIcon} />
        <div><div className={styles.kpiVal}>₡{totalMes.toLocaleString('es-CR')}</div><div className={styles.kpiLabel}>Gastos del mes actual</div></div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className={styles.tabla}>
          <div className={styles.th}><span>Fecha</span><span>Categoría</span><span>Descripción</span><span>N° Factura</span><span>Proveedor</span><span>Monto</span></div>
          {gastos.map(g => (
            <div key={g.id} className={styles.tr}>
              <span>{g.fecha}</span>
              <span className={styles.cat}>{g.categoria}</span>
              <span>{g.descripcion}</span>
              <span>{g.numero_factura || '-'}</span>
              <span>{g.proveedor?.nombre || '-'}</span>
              <span className={styles.monto}>₡{(+g.monto).toLocaleString('es-CR')}</span>
            </div>
          ))}
          {gastos.length === 0 && <p className={styles.empty}>Sin gastos registrados</p>}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nuevo Gasto</h2>
            <div className={styles.grid}>
              <div className={styles.fg}><label>Categoría</label><select value={form.categoria} onChange={f('categoria')}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className={styles.fg}><label>Monto *</label><input type="number" value={form.monto} onChange={f('monto')} /></div>
              <div className={`${styles.fg} ${styles.full}`}><label>Descripción *</label><input value={form.descripcion} onChange={f('descripcion')} /></div>
              <div className={styles.fg}><label>Fecha</label><input type="date" value={form.fecha} onChange={f('fecha')} /></div>
              <div className={styles.fg}><label>N° Factura</label><input value={form.numero_factura} onChange={f('numero_factura')} /></div>
              <div className={`${styles.fg} ${styles.full}`}><label>Notas</label><textarea value={form.notas} onChange={f('notas')} rows={2} /></div>
            </div>
            <div className={styles.actions}><button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={guardar}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
