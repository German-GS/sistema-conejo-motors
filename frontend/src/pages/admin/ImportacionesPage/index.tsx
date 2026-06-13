import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import styles from "./ImportacionesPage.module.css";
import { LuPlus, LuShip, LuChevronDown, LuChevronRight, LuTrash2, LuCircleCheck } from "react-icons/lu";

interface ImpVehiculo {
  id: number;
  vin?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
  costo_estimado_crc?: number;
  vehiculo?: { id: number } | null;
}

interface Importacion {
  id: number; numero_referencia: string; proveedor_nombre: string; pais_origen?: string;
  estado: string; fecha_embarque?: string; fecha_llegada_estimada?: string; fecha_llegada_real?: string;
  fecha_nacionalizacion?: string; numero_bill_lading?: string; numero_dua?: string;
  vehiculos?: ImpVehiculo[];
}

const ESTADOS = ['En Transito','En Puerto','En Aduana','Nacionalizado','Entregado'];
const estadoColor: Record<string, string> = {
  'En Transito':'#3b82f6','En Puerto':'#f59e0b','En Aduana':'#f97316','Nacionalizado':'#8b5cf6','Entregado':'#10b981'
};

const emptyVeh = { vin: '', marca: '', modelo: '', anio: '', color: '', costo_estimado_crc: '' };

export default function ImportacionesPage() {
  const confirm = useConfirm();
  const [lista, setLista] = useState<Importacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [vehForm, setVehForm] = useState<Record<number, typeof emptyVeh>>({});
  const [form, setForm] = useState({ numero_referencia: '', proveedor_nombre: '', pais_origen: '', numero_bill_lading: '', numero_dua: '', numero_factura_comercial: '', fecha_compra: '', fecha_embarque: '', fecha_llegada_estimada: '', estado: 'En Transito', notas: '' });

  const cargar = async () => { setLoading(true); const r = await apiClient.get("/importaciones"); setLista(r.data); setLoading(false); };
  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.numero_referencia || !form.proveedor_nombre) return toast.error("Complete los campos requeridos");
    await apiClient.post("/importaciones", form); setShowModal(false); cargar();
    toast.success("Importación creada");
  };

  const cambiarEstado = async (id: number, estado: string) => {
    await apiClient.patch(`/importaciones/${id}`, { estado }); cargar();
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (!vehForm[id]) setVehForm(prev => ({ ...prev, [id]: { ...emptyVeh } }));
  };

  const setVF = (impId: number, k: string) => (e: any) =>
    setVehForm(prev => ({ ...prev, [impId]: { ...prev[impId], [k]: e.target.value } }));

  const agregarVehiculo = async (impId: number) => {
    const vf = vehForm[impId];
    if (!vf?.vin) return toast.error("El VIN es requerido");
    await apiClient.post(`/importaciones/${impId}/vehiculos`, {
      vin: vf.vin.trim(),
      marca: vf.marca.trim() || null,
      modelo: vf.modelo.trim() || null,
      anio: vf.anio ? Number(vf.anio) : null,
      color: vf.color.trim() || null,
      costo_estimado_crc: vf.costo_estimado_crc ? Number(vf.costo_estimado_crc) : null,
    });
    setVehForm(prev => ({ ...prev, [impId]: { ...emptyVeh } }));
    cargar();
    toast.success("Vehículo agregado a la importación");
  };

  const eliminarVehiculo = async (vehId: number) => {
    const ok = await confirm({
      title: "Eliminar vehículo de importación",
      message: "¿Eliminar este vehículo de la importación?",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await apiClient.delete(`/importaciones/vehiculos/${vehId}`);
    cargar();
  };

  const promover = async (v: ImpVehiculo) => {
    const ok = await confirm({
      title: "Crear en inventario",
      message: `Crear "${v.marca || ''} ${v.modelo || ''} (${v.vin})" en inventario? Quedará oculto hasta completar ficha y precio.`,
      confirmText: "Crear",
    });
    if (!ok) return;
    try {
      const r = await apiClient.post(`/importaciones/vehiculos/${v.id}/promover`, {});
      toast.success(r.data.mensaje || "Vehículo creado en inventario");
      cargar();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "No se pudo crear el vehículo");
    }
  };

  const f = (k: any) => (e: any) => setForm({...form, [k]: e.target.value});

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Gestión de Importaciones</h1><p>Seguimiento documental y alta de vehículos a inventario</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}><LuPlus size={16} /> Nueva Importación</button>
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> : (
        <div className={styles.lista}>
          {lista.length === 0 && <p className={styles.empty}>No hay importaciones registradas</p>}
          {lista.map(imp => {
            const isExp = expanded.has(imp.id);
            const vf = vehForm[imp.id] || emptyVeh;
            return (
            <div key={imp.id} className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className={styles.cardLeft}>
                  <button
                    onClick={() => toggleExpand(imp.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#024f7d', display: 'flex', alignItems: 'center' }}
                    title="Ver vehículos"
                  >
                    {isExp ? <LuChevronDown size={20} /> : <LuChevronRight size={20} />}
                  </button>
                  <LuShip size={24} className={styles.icon} />
                  <div>
                    <div className={styles.ref}>{imp.numero_referencia}</div>
                    <div className={styles.prov}>{imp.proveedor_nombre} {imp.pais_origen ? `— ${imp.pais_origen}` : ''}</div>
                    <div className={styles.docs}>
                      {imp.numero_bill_lading && <span>BL: {imp.numero_bill_lading}</span>}
                      {imp.numero_dua && <span>DUA: {imp.numero_dua}</span>}
                      {imp.fecha_embarque && <span>Embarque: {imp.fecha_embarque}</span>}
                      {imp.fecha_llegada_estimada && <span>Llegada est.: {imp.fecha_llegada_estimada}</span>}
                    </div>
                    <div className={styles.vehCount}>
                      {imp.vehiculos?.length || 0} vehículo(s) · {imp.vehiculos?.filter(v => v.vehiculo).length || 0} en inventario
                    </div>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <span className={styles.badge} style={{ background: estadoColor[imp.estado]+'22', color: estadoColor[imp.estado] }}>{imp.estado}</span>
                  <select className={styles.estadoSel} value={imp.estado} onChange={e => cambiarEstado(imp.id, e.target.value)}>
                    {ESTADOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {isExp && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  {/* Lista de vehículos */}
                  {(imp.vehiculos?.length ?? 0) > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '4px 8px' }}>VIN</th>
                          <th style={{ padding: '4px 8px' }}>Marca / Modelo</th>
                          <th style={{ padding: '4px 8px' }}>Año</th>
                          <th style={{ padding: '4px 8px' }}>Color</th>
                          <th style={{ padding: '4px 8px' }}>Costo CRC</th>
                          <th style={{ padding: '4px 8px' }}>Inventario</th>
                          <th style={{ padding: '4px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {imp.vehiculos!.map(v => (
                          <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{v.vin || '—'}</td>
                            <td style={{ padding: '4px 8px' }}>{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</td>
                            <td style={{ padding: '4px 8px' }}>{v.anio || '—'}</td>
                            <td style={{ padding: '4px 8px' }}>{v.color || '—'}</td>
                            <td style={{ padding: '4px 8px' }}>{v.costo_estimado_crc ? `₡${Number(v.costo_estimado_crc).toLocaleString('es-CR')}` : '—'}</td>
                            <td style={{ padding: '4px 8px' }}>
                              {v.vehiculo
                                ? <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}><LuCircleCheck size={14} /> #{v.vehiculo.id}</span>
                                : <span style={{ color: '#94a3b8' }}>No creado</span>}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {!v.vehiculo && (
                                <button
                                  className={styles.btnPrimary}
                                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                  onClick={() => promover(v)}
                                >
                                  ➕ Crear en inventario
                                </button>
                              )}
                              <button
                                onClick={() => eliminarVehiculo(v.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 6 }}
                                title="Eliminar"
                              >
                                <LuTrash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>Sin vehículos. Agregue abajo.</p>
                  )}

                  {/* Form para agregar vehículo */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.75rem', alignItems: 'center' }}>
                    <input placeholder="VIN *" value={vf.vin} onChange={setVF(imp.id, 'vin')} style={inp(150)} />
                    <input placeholder="Marca" value={vf.marca} onChange={setVF(imp.id, 'marca')} style={inp(90)} />
                    <input placeholder="Modelo" value={vf.modelo} onChange={setVF(imp.id, 'modelo')} style={inp(110)} />
                    <input placeholder="Año" type="number" value={vf.anio} onChange={setVF(imp.id, 'anio')} style={inp(70)} />
                    <input placeholder="Color" value={vf.color} onChange={setVF(imp.id, 'color')} style={inp(90)} />
                    <input placeholder="Costo CRC" type="number" value={vf.costo_estimado_crc} onChange={setVF(imp.id, 'costo_estimado_crc')} style={inp(110)} />
                    <button className={styles.btnSecondary} style={{ padding: '6px 12px' }} onClick={() => agregarVehiculo(imp.id)}>
                      <LuPlus size={14} /> Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )})}
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

const inp = (w: number): React.CSSProperties => ({
  width: w, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem',
});
