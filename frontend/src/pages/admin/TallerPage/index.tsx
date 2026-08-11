import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./TallerPage.module.css";
import { LuPlus, LuWrench } from "react-icons/lu";

interface OrdenTrabajo {
  id: number; numero: string; descripcion_problema: string; estado: string;
  fecha_ingreso: string; fecha_estimada_entrega?: string; total: number;
  cliente?: { nombre_completo: string };
  vehiculo?: { marca: string; modelo: string; año: number };
  tecnico?: { nombre: string };
  descripcion_vehiculo?: string;
}

const ESTADOS = ['Recibido','Diagnostico','En Reparacion','Listo','Entregado','Cancelado'];
const estadoColor: Record<string, string> = {
  Recibido: 'var(--slate-500)', Diagnostico: 'var(--warning)', 'En Reparacion': '#3b82f6', Listo: '#10b981', Entregado: 'var(--brand)', Cancelado: '#ef4444',
};

export default function TallerPage() {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    descripcion_problema: '', descripcion_vehiculo: '', fecha_ingreso: new Date().toISOString().split('T')[0],
    fecha_estimada_entrega: '', estado: 'Recibido', notas: '',
  });

  const cargar = async () => {
    setLoading(true);
    const r = await apiClient.get("/taller");
    setOrdenes(r.data); setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.descripcion_problema || !form.fecha_ingreso) return toast.error("Complete los campos requeridos");
    await apiClient.post("/taller", form);
    setShowModal(false); cargar();
  };

  const cambiarEstado = async (id: number, estado: string) => {
    await apiClient.patch(`/taller/${id}`, { estado });
    cargar();
  };

  const ordenesF = filtro === 'Todos' ? ordenes : ordenes.filter(o => o.estado === filtro);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Taller y Postventa</h1><p>Gestión de órdenes de trabajo y servicio</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nueva OT</button>
      </div>

      <div className={styles.filtros}>
        {['Todos', ...ESTADOS].map(e => (
          <button key={e} className={`${styles.fbtn} ${filtro === e ? styles.fActivo : ''}`}
            style={filtro === e && e !== 'Todos' ? { background: estadoColor[e]+'22', color: estadoColor[e], borderColor: estadoColor[e] } : {}}
            onClick={() => setFiltro(e)}>{e}</button>
        ))}
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> : (
        <div className={styles.grid}>
          {ordenesF.length === 0 && <p className={styles.empty}>No hay órdenes</p>}
          {ordenesF.map(o => (
            <div key={o.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.numero}>{o.numero}</span>
                <span className={styles.badge} style={{ background: estadoColor[o.estado]+'22', color: estadoColor[o.estado] }}>{o.estado}</span>
              </div>
              <div className={styles.vehiculoNombre}>
                <LuWrench size={14} />
                {o.vehiculo ? `${o.vehiculo.marca} ${o.vehiculo.modelo} ${o.vehiculo.año}` : o.descripcion_vehiculo || 'Vehículo no especificado'}
              </div>
              {o.cliente && <div className={styles.meta}>Cliente: {o.cliente.nombre_completo}</div>}
              <div className={styles.problema}>{o.descripcion_problema}</div>
              <div className={styles.meta}>
                Ingreso: {o.fecha_ingreso}
                {o.fecha_estimada_entrega && ` • Entrega est.: ${o.fecha_estimada_entrega}`}
              </div>
              {o.total > 0 && <div className={styles.total}>Total: ₡{(+o.total).toLocaleString('es-CR')}</div>}
              <div className={styles.actions}>
                {ESTADOS.indexOf(o.estado) < ESTADOS.length - 2 && (
                  <button className={styles.btnNext} onClick={() => cambiarEstado(o.id, ESTADOS[ESTADOS.indexOf(o.estado) + 1])}>
                    → {ESTADOS[ESTADOS.indexOf(o.estado) + 1]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Orden de Trabajo</h2>
            <div className={styles.fg}><label>Descripción del Vehículo</label><input value={form.descripcion_vehiculo} onChange={e => setForm({...form, descripcion_vehiculo: e.target.value})} placeholder="Ej: Toyota Corolla 2020" /></div>
            <div className={styles.fg}><label>Problema Reportado *</label><textarea value={form.descripcion_problema} onChange={e => setForm({...form, descripcion_problema: e.target.value})} rows={3} /></div>
            <div className={styles.row}>
              <div className={styles.fg}><label>Fecha Ingreso *</label><input type="date" value={form.fecha_ingreso} onChange={e => setForm({...form, fecha_ingreso: e.target.value})} /></div>
              <div className={styles.fg}><label>Entrega Estimada</label><input type="date" value={form.fecha_estimada_entrega} onChange={e => setForm({...form, fecha_estimada_entrega: e.target.value})} /></div>
            </div>
            <div className={styles.fg}><label>Notas</label><textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2} /></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={guardar}>Crear OT</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
