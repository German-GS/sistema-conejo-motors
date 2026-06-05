import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./CajaChicaPage.module.css";
import { LuPlus, LuWallet, LuCircleMinus, LuCirclePlus } from "react-icons/lu";

interface CajaChica {
  id: number; nombre: string; monto_inicial: number; saldo_actual: number; estado: string;
  responsable?: { nombre: string; email: string };
}

interface Movimiento {
  id: number; tipo: string; monto: number; descripcion: string; categoria?: string;
  fecha: string; numero_comprobante?: string;
}

export default function CajaChicaPage() {
  const [cajas, setCajas] = useState<CajaChica[]>([]);
  const [seleccionada, setSeleccionada] = useState<CajaChica | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaCaja, setShowNuevaCaja] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [cajaForm, setCajaForm] = useState({ nombre: '', monto_inicial: '' });
  const [movForm, setMovForm] = useState({ tipo: 'Egreso', monto: '', descripcion: '', categoria: 'Alimentacion', fecha: new Date().toISOString().split('T')[0], numero_comprobante: '' });

  const cargar = async () => {
    setLoading(true);
    const r = await apiClient.get("/caja-chica");
    setCajas(r.data); setLoading(false);
  };

  const cargarMovimientos = async (id: number) => {
    const r = await apiClient.get(`/caja-chica/${id}`);
    setSeleccionada(r.data);
    setMovimientos(r.data.movimientos || []);
  };

  useEffect(() => { cargar(); }, []);

  const crearCaja = async () => {
    if (!cajaForm.nombre || !cajaForm.monto_inicial) return alert("Complete los campos");
    await apiClient.post("/caja-chica", { nombre: cajaForm.nombre, monto_inicial: +cajaForm.monto_inicial });
    setShowNuevaCaja(false); cargar();
  };

  const registrarMov = async () => {
    if (!movForm.monto || !seleccionada) return alert("Monto requerido");
    await apiClient.post(`/caja-chica/${seleccionada.id}/movimiento`, { ...movForm, monto: +movForm.monto });
    setShowMov(false); cargarMovimientos(seleccionada.id); cargar();
  };

  const cerrar = async (id: number) => {
    if (!confirm("¿Cerrar caja chica?")) return;
    await apiClient.patch(`/caja-chica/${id}/cerrar`);
    cargar(); if (seleccionada?.id === id) cargarMovimientos(id);
  };

  const CATEGORIAS = ['Alimentacion', 'Transporte', 'Papeleria', 'Servicios', 'Compras menores', 'Otro'];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Caja Chica</h1><p>Control de fondos de caja chica</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowNuevaCaja(true)}><LuPlus size={16} /> Nueva Caja</button>
      </div>

      <div className={styles.layout}>
        <div className={styles.cajasList}>
          {loading ? <p>Cargando...</p> : cajas.map(c => (
            <div key={c.id} className={`${styles.cajaCard} ${seleccionada?.id === c.id ? styles.activa : ''}`} onClick={() => cargarMovimientos(c.id)}>
              <div className={styles.cajaTop}>
                <LuWallet size={20} className={styles.cajaIcon} />
                <span className={`${styles.estadoBadge} ${c.estado === 'Abierta' ? styles.abierta : styles.cerrada}`}>{c.estado}</span>
              </div>
              <div className={styles.cajaNombre}>{c.nombre}</div>
              <div className={styles.cajaSaldo}>₡{(+c.saldo_actual).toLocaleString('es-CR')}</div>
              <div className={styles.cajaInicial}>Inicial: ₡{(+c.monto_inicial).toLocaleString('es-CR')}</div>
              {c.estado === 'Abierta' && <button className={styles.btnCerrar} onClick={e => { e.stopPropagation(); cerrar(c.id); }}>Cerrar</button>}
            </div>
          ))}
          {!loading && cajas.length === 0 && <p className={styles.empty}>Sin cajas registradas</p>}
        </div>

        <div className={styles.movPanel}>
          {!seleccionada ? (
            <div className={styles.placeholder}>← Selecciona una caja para ver sus movimientos</div>
          ) : (
            <>
              <div className={styles.movHeader}>
                <h2>Movimientos — {seleccionada.nombre}</h2>
                {seleccionada.estado === 'Abierta' && <button className={styles.btnPrimary} onClick={() => setShowMov(true)}><LuPlus size={14} /> Movimiento</button>}
              </div>
              <div className={styles.movLista}>
                {movimientos.length === 0 && <p className={styles.empty}>Sin movimientos</p>}
                {movimientos.map(m => (
                  <div key={m.id} className={styles.movRow}>
                    <div className={styles.movIcon} style={{ background: m.tipo === 'Ingreso' ? '#d1fae5' : '#fee2e2' }}>
                      {m.tipo === 'Ingreso' ? <LuCirclePlus size={16} color="#059669" /> : <LuCircleMinus size={16} color="#ef4444" />}
                    </div>
                    <div className={styles.movInfo}>
                      <div className={styles.movDesc}>{m.descripcion}</div>
                      <div className={styles.movMeta}>{m.categoria} • {m.fecha}{m.numero_comprobante ? ` • ${m.numero_comprobante}` : ''}</div>
                    </div>
                    <div className={`${styles.movMonto} ${m.tipo === 'Ingreso' ? styles.ingreso : styles.egreso}`}>
                      {m.tipo === 'Ingreso' ? '+' : '-'}₡{(+m.monto).toLocaleString('es-CR')}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showNuevaCaja && (
        <div className={styles.overlay} onClick={() => setShowNuevaCaja(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Caja Chica</h2>
            <div className={styles.fg}><label>Nombre</label><input value={cajaForm.nombre} onChange={e => setCajaForm({...cajaForm, nombre: e.target.value})} /></div>
            <div className={styles.fg}><label>Monto Inicial</label><input type="number" value={cajaForm.monto_inicial} onChange={e => setCajaForm({...cajaForm, monto_inicial: e.target.value})} /></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowNuevaCaja(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={crearCaja}>Crear</button></div>
          </div>
        </div>
      )}

      {showMov && (
        <div className={styles.overlay} onClick={() => setShowMov(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nuevo Movimiento</h2>
            <div className={styles.fg}><label>Tipo</label><select value={movForm.tipo} onChange={e => setMovForm({...movForm, tipo: e.target.value})}><option>Egreso</option><option>Ingreso</option></select></div>
            <div className={styles.fg}><label>Monto *</label><input type="number" value={movForm.monto} onChange={e => setMovForm({...movForm, monto: e.target.value})} /></div>
            <div className={styles.fg}><label>Descripción *</label><input value={movForm.descripcion} onChange={e => setMovForm({...movForm, descripcion: e.target.value})} /></div>
            <div className={styles.fg}><label>Categoría</label><select value={movForm.categoria} onChange={e => setMovForm({...movForm, categoria: e.target.value})}>{CATEGORIAS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className={styles.fg}><label>Fecha</label><input type="date" value={movForm.fecha} onChange={e => setMovForm({...movForm, fecha: e.target.value})} /></div>
            <div className={styles.fg}><label>N° Comprobante</label><input value={movForm.numero_comprobante} onChange={e => setMovForm({...movForm, numero_comprobante: e.target.value})} /></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowMov(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={registrarMov}>Registrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
