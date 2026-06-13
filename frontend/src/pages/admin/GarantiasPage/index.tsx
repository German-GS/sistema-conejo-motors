import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./GarantiasPage.module.css";
import { LuPlus, LuShield } from "react-icons/lu";

interface Garantia {
  id: number; tipo: string; fecha_inicio: string; fecha_fin: string;
  meses?: number; estado: string;
  vehiculo?: { marca: string; modelo: string; año: number; vin: string };
  cliente?: { nombre_completo: string };
  reclamos?: any[];
  condiciones?: string;
  vin?: string;
}

const estadoColor: Record<string, string> = { Activa: '#10b981', Vencida: '#ef4444', Anulada: '#94a3b8' };
const TIPOS = ['General', 'Bateria', 'Motor', 'Electrico', 'Transmision'];

export default function GarantiasPage() {
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReclamo, setShowReclamo] = useState<number | null>(null);
  const [form, setForm] = useState({ tipo: 'General', fecha_inicio: '', fecha_fin: '', meses: '', vin: '', condiciones: '' });
  const [reclamoForm, setReclamoForm] = useState({ descripcion: '', fecha_reclamo: new Date().toISOString().split('T')[0] });

  const cargar = async () => {
    setLoading(true);
    const r = await apiClient.get("/garantias");
    setGarantias(r.data); setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.tipo || !form.fecha_inicio || !form.fecha_fin) return toast.error("Complete los campos");
    await apiClient.post("/garantias", { ...form, meses: form.meses ? +form.meses : undefined });
    setShowModal(false); cargar();
  };

  const agregarReclamo = async () => {
    if (!reclamoForm.descripcion || !showReclamo) return;
    await apiClient.post(`/garantias/${showReclamo}/reclamo`, reclamoForm);
    setShowReclamo(null); cargar();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Garantías</h1><p>Control de garantías de vehículos y reclamos</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nueva Garantía</button>
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> : (
        <div className={styles.grid}>
          {garantias.length === 0 && <p className={styles.empty}>No hay garantías registradas</p>}
          {garantias.map(g => (
            <div key={g.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.tipo}><LuShield size={16} />{g.tipo}</div>
                <span className={styles.badge} style={{ background: estadoColor[g.estado]+'22', color: estadoColor[g.estado] }}>{g.estado}</span>
              </div>
              {g.vehiculo && <div className={styles.vehiculo}>{g.vehiculo.marca} {g.vehiculo.modelo} {g.vehiculo.año} — {g.vehiculo.vin}</div>}
              {!g.vehiculo && g.vin && <div className={styles.vehiculo}>VIN: {g.vin}</div>}
              {g.cliente && <div className={styles.meta}>Cliente: {g.cliente.nombre_completo}</div>}
              <div className={styles.fechas}>
                <span>Inicio: {g.fecha_inicio}</span>
                <span>Fin: {g.fecha_fin}</span>
                {g.meses && <span>{g.meses} meses</span>}
              </div>
              {g.condiciones && <div className={styles.cond}>{g.condiciones}</div>}
              <div className={styles.reclamosInfo}>
                {(g.reclamos?.length || 0)} reclamo(s)
              </div>
              {g.estado === 'Activa' && (
                <button className={styles.btnReclamo} onClick={() => setShowReclamo(g.id)}>+ Reclamo</button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Garantía</h2>
            <div className={styles.row}><div className={styles.fg}><label>Tipo</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div><div className={styles.fg}><label>Meses</label><input type="number" value={form.meses} onChange={e => setForm({...form, meses: e.target.value})} /></div></div>
            <div className={styles.row}><div className={styles.fg}><label>Inicio *</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} /></div><div className={styles.fg}><label>Fin *</label><input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} /></div></div>
            <div className={styles.fg}><label>VIN del Vehículo</label><input value={form.vin} onChange={e => setForm({...form, vin: e.target.value})} /></div>
            <div className={styles.fg}><label>Condiciones</label><textarea value={form.condiciones} onChange={e => setForm({...form, condiciones: e.target.value})} rows={2} /></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={guardar}>Guardar</button></div>
          </div>
        </div>
      )}

      {showReclamo && (
        <div className={styles.overlay} onClick={() => setShowReclamo(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nuevo Reclamo</h2>
            <div className={styles.fg}><label>Descripción *</label><textarea value={reclamoForm.descripcion} onChange={e => setReclamoForm({...reclamoForm, descripcion: e.target.value})} rows={4} /></div>
            <div className={styles.fg}><label>Fecha Reclamo</label><input type="date" value={reclamoForm.fecha_reclamo} onChange={e => setReclamoForm({...reclamoForm, fecha_reclamo: e.target.value})} /></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowReclamo(null)}>Cancelar</button><button className={styles.btnPrimary} onClick={agregarReclamo}>Registrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
