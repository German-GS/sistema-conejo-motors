import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./ProveedoresPage.module.css";
import { LuPlus, LuPencil, LuBuildingStorefront } from "react-icons/lu";

interface Proveedor {
  id: number; nombre: string; cedula_juridica?: string; email?: string; telefono?: string;
  pais?: string; condicion_pago?: string; contacto_nombre?: string; activo: boolean;
}

const EMPTY: Partial<Proveedor> = { nombre: '', cedula_juridica: '', email: '', telefono: '', pais: 'Costa Rica', condicion_pago: '30 días neto', contacto_nombre: '' };

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<Partial<Proveedor>>(EMPTY);

  const cargar = async () => {
    setLoading(true);
    try { const r = await apiClient.get("/proveedores"); setProveedores(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => { setEditando(null); setForm(EMPTY); setShowModal(true); };
  const abrirEditar = (p: Proveedor) => { setEditando(p); setForm(p); setShowModal(true); };

  const guardar = async () => {
    if (!form.nombre) return alert("Nombre requerido");
    try {
      if (editando) await apiClient.patch(`/proveedores/${editando.id}`, form);
      else await apiClient.post("/proveedores", form);
      setShowModal(false); cargar();
    } catch { alert("Error al guardar"); }
  };

  const f = (key: keyof Proveedor) => (e: any) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Proveedores</h1><p>Registro y gestión de proveedores</p></div>
        <button className={styles.btnPrimary} onClick={abrirNuevo}><LuPlus size={16} /> Nuevo Proveedor</button>
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> : (
        <div className={styles.tabla}>
          <div className={styles.tablaHeader}>
            <span>Nombre</span><span>Cédula/RUC</span><span>País</span><span>Contacto</span><span>Condición Pago</span><span>Acciones</span>
          </div>
          {proveedores.filter(p => p.activo).map(p => (
            <div key={p.id} className={styles.tablaRow}>
              <span className={styles.nombre}><LuBuildingStorefront size={14} className={styles.rowIcon} />{p.nombre}</span>
              <span>{p.cedula_juridica || '-'}</span>
              <span>{p.pais || '-'}</span>
              <span>{p.contacto_nombre || p.email || '-'}</span>
              <span>{p.condicion_pago || '-'}</span>
              <span><button className={styles.btnEdit} onClick={() => abrirEditar(p)}><LuPencil size={13} /> Editar</button></span>
            </div>
          ))}
          {proveedores.filter(p => p.activo).length === 0 && <p className={styles.empty}>No hay proveedores registrados</p>}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}><label>Nombre *</label><input value={form.nombre||''} onChange={f('nombre')} /></div>
              <div className={styles.formGroup}><label>Cédula Jurídica</label><input value={form.cedula_juridica||''} onChange={f('cedula_juridica')} /></div>
              <div className={styles.formGroup}><label>Email</label><input value={form.email||''} onChange={f('email')} /></div>
              <div className={styles.formGroup}><label>Teléfono</label><input value={form.telefono||''} onChange={f('telefono')} /></div>
              <div className={styles.formGroup}><label>País</label><input value={form.pais||''} onChange={f('pais')} /></div>
              <div className={styles.formGroup}><label>Condición de Pago</label><input value={form.condicion_pago||''} onChange={f('condicion_pago')} /></div>
              <div className={styles.formGroup}><label>Contacto</label><input value={form.contacto_nombre||''} onChange={f('contacto_nombre')} /></div>
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
