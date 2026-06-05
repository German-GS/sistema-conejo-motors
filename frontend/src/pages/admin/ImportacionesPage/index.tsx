import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./ImportacionesPage.module.css";
import { LuPlus, LuShip } from "react-icons/lu";

interface Importacion {
  id: number; numero_referencia: string; proveedor_nombre: string; pais_origen?: string;
  estado: string; fecha_embarque?: string; fecha_llegada_estimada?: string; fecha_llegada_real?: string;
  fecha_nacionalizacion?: string; numero_bill_lading?: string; numero_dua?: string;
  vehiculos?: any[];
}

const ESTADOS = ['En Transito','En Puerto','En Aduana','Nacionalizado','Entregado'];
const estadoColor: Record<string, string> = {
  'En Transito':'#3b82f6','En Puerto':'#f59e0b','En Aduana':'#f97316','Nacionalizado':'#8b5cf6','Entregado':'#10b981'
};

export default function ImportacionesPage() {
  const [lista, setLista] = useState<Importacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ numero_referencia: '', proveedor_nombre: '', pais_origen: '', numero_bill_lading: '', numero_dua: '', numero_factura_comercial: '', fecha_compra: '', fecha_embarque: '', fecha_llegada_estimada: '', estado: 'En Transito', notas: '' });

  const cargar = async () => { setLoading(true); const r = await apiClient.get("/importaciones"); setLista(r.data); setLoading(false); };
  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.numero_referencia || !form.proveedor_nombre) return alert("Complete los campos requeridos");
    await apiClient.post("/importaciones", form); setShowModal(false); cargar();
  };

  const cambiarEstado = async (id: number, estado: string) => {
    await apiClient.patch(`/importaciones/${id}`, { estado }); cargar();
  };

  const f = (k: any) => (e: any) => setForm({...form, [k]: e.target.value});

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Gestión de Importaciones</h1><p>Seguimiento documental de importaciones</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nueva Importación</button>
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> : (
        <div className={styles.lista}>
          {lista.length === 0 && <p className={styles.empty}>No hay importaciones registradas</p>}
          {lista.map(imp => (
            <div key={imp.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <LuShip size={24} className={styles.icon} />
                <div>
                  <div className={styles.ref}>{imp.numero_referencia}</div>
                  <div className={styles.prov}>{imp.proveedor_nombre} {imp.pais_origen ? `— ${imp.pais_origen}` : ''}</div>
                  <div className={styles.docs}>
                    {imp.numero_bill_lading && <span>BL: {imp.numero_bill_lading}</span>}
                    {imp.numero_dua && <span>DUA: {imp.numero_dua}</span>}
                    {imp.fecha_embarque && <span>Embarque: {imp.fecha_embarque}</span>}
                    {imp.fecha_llegada_estimada && <span>Llegada est.: {imp.fecha_llegada_estimada}</span>}
                    {imp.fecha_llegada_real && <span>Llegada real: {imp.fecha_llegada_real}</span>}
                  </div>
                  <div className={styles.vehCount}>{imp.vehiculos?.length || 0} vehículo(s) asociado(s)</div>
                </div>
              </div>
              <div className={styles.cardRight}>
                <span className={styles.badge} style={{ background: estadoColor[imp.estado]+'22', color: estadoColor[imp.estado] }}>{imp.estado}</span>
                <select className={styles.estadoSel} value={imp.estado} onChange={e => cambiarEstado(imp.id, e.target.value)}>
                  {ESTADOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Importación</h2>
            <div className={styles.grid}>
              <div className={styles.fg}><label>N° Referencia *</label><input value={form.numero_referencia} onChange={f('numero_referencia')} /></div>
              <div className={styles.fg}><label>Proveedor *</label><input value={form.proveedor_nombre} onChange={f('proveedor_nombre')} /></div>
              <div className={styles.fg}><label>País Origen</label><input value={form.pais_origen} onChange={f('pais_origen')} /></div>
              <div className={styles.fg}><label>N° Factura Comercial</label><input value={form.numero_factura_comercial} onChange={f('numero_factura_comercial')} /></div>
              <div className={styles.fg}><label>Bill of Lading</label><input value={form.numero_bill_lading} onChange={f('numero_bill_lading')} /></div>
              <div className={styles.fg}><label>DUA</label><input value={form.numero_dua} onChange={f('numero_dua')} /></div>
              <div className={styles.fg}><label>Fecha Compra</label><input type="date" value={form.fecha_compra} onChange={f('fecha_compra')} /></div>
              <div className={styles.fg}><label>Fecha Embarque</label><input type="date" value={form.fecha_embarque} onChange={f('fecha_embarque')} /></div>
              <div className={styles.fg}><label>Llegada Estimada</label><input type="date" value={form.fecha_llegada_estimada} onChange={f('fecha_llegada_estimada')} /></div>
              <div className={styles.fg}><label>Estado</label><select value={form.estado} onChange={f('estado')}>{ESTADOS.map(s=><option key={s}>{s}</option>)}</select></div>
              <div className={`${styles.fg} ${styles.full}`}><label>Notas</label><textarea value={form.notas} onChange={f('notas')} rows={2} /></div>
            </div>
            <div className={styles.actions}><button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={guardar}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
