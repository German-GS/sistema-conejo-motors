import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./AgendaPage.module.css";
import {
  LuPlus, LuCalendar, LuPhone, LuUsers, LuCar, LuCheck, LuX,
} from "react-icons/lu";

interface Cita {
  id: number;
  titulo: string;
  tipo: string;
  fecha_hora: string;
  duracion_minutos: number;
  estado: string;
  descripcion?: string;
  notas_resultado?: string;
  lead?: { id: number; nombre_cliente: string };
  cliente?: { id: number; nombre_completo: string };
  asignado_a?: { id: number; nombre: string; email: string };
}

const tipoIcono = (tipo: string) => {
  if (tipo === 'Llamada') return <LuPhone size={14} />;
  if (tipo === 'Reunion') return <LuUsers size={14} />;
  if (tipo === 'Prueba de Manejo') return <LuCar size={14} />;
  return <LuCalendar size={14} />;
};

const estadoColor: Record<string, string> = {
  Pendiente: '#f59e0b', Completada: '#10b981', Cancelada: '#ef4444',
};

export default function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cita | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("Pendiente");
  const [form, setForm] = useState({
    titulo: '', tipo: 'Seguimiento', fecha_hora: '', duracion_minutos: 30,
    descripcion: '', estado: 'Pendiente',
    lead: null as any, cliente: null as any,
  });

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/agenda");
      setCitas(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNueva = () => {
    setEditando(null);
    const ahora = new Date(); ahora.setMinutes(0, 0, 0);
    setForm({ titulo: '', tipo: 'Seguimiento', fecha_hora: ahora.toISOString().slice(0, 16), duracion_minutos: 30, descripcion: '', estado: 'Pendiente', lead: null, cliente: null });
    setShowModal(true);
  };

  const abrirEditar = (c: Cita) => {
    setEditando(c);
    setForm({
      titulo: c.titulo, tipo: c.tipo,
      fecha_hora: c.fecha_hora ? new Date(c.fecha_hora).toISOString().slice(0, 16) : '',
      duracion_minutos: c.duracion_minutos, descripcion: c.descripcion || '',
      estado: c.estado, lead: c.lead ? { id: c.lead.id } : null, cliente: c.cliente ? { id: c.cliente.id } : null,
    });
    setShowModal(true);
  };

  const guardar = async () => {
    if (!form.titulo || !form.fecha_hora) return toast.error("Título y fecha son requeridos");
    try {
      if (editando) {
        await apiClient.patch(`/agenda/${editando.id}`, form);
      } else {
        await apiClient.post("/agenda", form);
      }
      setShowModal(false);
      cargar();
    } catch { toast.error("Error al guardar cita"); }
  };

  const cambiarEstado = async (id: number, estado: string) => {
    await apiClient.patch(`/agenda/${id}`, { estado });
    cargar();
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta cita?")) return;
    await apiClient.delete(`/agenda/${id}`);
    cargar();
  };

  const citasFiltradas = filtroEstado === 'Todas' ? citas : citas.filter(c => c.estado === filtroEstado);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Agenda</h1>
          <p>Gestión de citas, llamadas y seguimientos</p>
        </div>
        <button className={styles.btnPrimary} onClick={abrirNueva}>
          <LuPlus size={16} /> Nueva Cita
        </button>
      </div>

      <div className={styles.filtros}>
        {['Todas', 'Pendiente', 'Completada', 'Cancelada'].map(f => (
          <button key={f} className={`${styles.filtroBtn} ${filtroEstado === f ? styles.filtroActivo : ''}`}
            onClick={() => setFiltroEstado(f)}>{f}</button>
        ))}
      </div>

      {loading ? <p className={styles.loading}>Cargando agenda...</p> : (
        <div className={styles.lista}>
          {citasFiltradas.length === 0 && <p className={styles.empty}>No hay citas para mostrar</p>}
          {citasFiltradas.map(c => (
            <div key={c.id} className={styles.citaCard}>
              <div className={styles.citaLeft}>
                <div className={styles.tipoIcon} style={{ background: estadoColor[c.estado] + '22', color: estadoColor[c.estado] }}>
                  {tipoIcono(c.tipo)}
                </div>
                <div>
                  <div className={styles.citaTitulo}>{c.titulo}</div>
                  <div className={styles.citaMeta}>
                    <span>{c.tipo}</span>
                    <span>•</span>
                    <span>{new Date(c.fecha_hora).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span>•</span>
                    <span>{c.duracion_minutos} min</span>
                    {c.lead && <><span>•</span><span>Lead: {c.lead.nombre_cliente}</span></>}
                    {c.cliente && <><span>•</span><span>Cliente: {c.cliente.nombre_completo}</span></>}
                  </div>
                  {c.descripcion && <div className={styles.citaDesc}>{c.descripcion}</div>}
                </div>
              </div>
              <div className={styles.citaActions}>
                <span className={styles.estadoBadge} style={{ background: estadoColor[c.estado] + '22', color: estadoColor[c.estado] }}>
                  {c.estado}
                </span>
                {c.estado === 'Pendiente' && (
                  <button className={styles.btnSuccess} onClick={() => cambiarEstado(c.id, 'Completada')} title="Marcar completada">
                    <LuCheck size={14} />
                  </button>
                )}
                <button className={styles.btnEdit} onClick={() => abrirEditar(c)}>Editar</button>
                <button className={styles.btnDanger} onClick={() => eliminar(c.id)}><LuX size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar Cita' : 'Nueva Cita'}</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Título *</label>
                <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  {['Llamada', 'Reunion', 'Seguimiento', 'Prueba de Manejo', 'Otro'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Fecha y Hora *</label>
                <input type="datetime-local" value={form.fecha_hora} onChange={e => setForm({...form, fecha_hora: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Duración (min)</label>
                <input type="number" value={form.duracion_minutos} onChange={e => setForm({...form, duracion_minutos: +e.target.value})} />
              </div>
              {editando && (
                <div className={styles.formGroup}>
                  <label>Estado</label>
                  <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                    {['Pendiente', 'Completada', 'Cancelada'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={3} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={guardar}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
