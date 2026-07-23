import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./CampanasPage.module.css";
import { fmtFechaLocal } from "@/utils/dateUtils";
import {
  LuThumbsUp, LuCamera, LuMusic, LuMegaphone, LuCalendarDays,
  LuWallet, LuBookOpenCheck, LuPencil, LuCircleCheck,
} from "react-icons/lu";
import type { IconType } from "react-icons";

const fmtCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

interface Campana {
  id: number;
  nombre: string;
  plataforma: "Facebook" | "Instagram" | "TikTok" | "Otro";
  estado: "Activa" | "Pausada" | "Finalizada";
  fecha_inicio: string;
  fecha_fin?: string;
  presupuesto_crc: number;
  objetivo?: string;
  gasto_id?: number;
  fecha_creacion: string;
}

interface Metricas {
  totalLeads: number;
  cotizaciones: number;
  cerrados: number;
  perdidos: number;
  tasaConversion: number;
  costoPorLead: number;
  costoPorCierre: number;
}

const PLATAFORMA_ICONS: Record<string, IconType> = {
  Facebook: LuThumbsUp, Instagram: LuCamera, TikTok: LuMusic, Otro: LuMegaphone,
};
const PLATAFORMA_COLORS: Record<string, string> = {
  Facebook: "#1877f2", Instagram: "#c13584", TikTok: "#010101", Otro: "#64748b",
};
const ESTADO_COLORS: Record<string, string> = {
  Activa: "#16a34a", Pausada: "#f59e0b", Finalizada: "#64748b",
};

const EMPTY_FORM = {
  nombre: "", plataforma: "Facebook", fecha_inicio: "", fecha_fin: "",
  presupuesto_crc: "", objetivo: "",
};

export const CampanasPage = () => {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [guardando, setGuardando] = useState(false);
  const [metricas, setMetricas] = useState<Record<number, Metricas>>({});
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    apiClient.get("/campanas")
      .then((r) => setCampanas(r.data))
      .catch(() => toast.error("No se pudieron cargar las campañas."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const loadMetricas = async (id: number) => {
    if (metricas[id]) return;
    try {
      const r = await apiClient.get(`/campanas/${id}/metricas`);
      setMetricas((prev) => ({ ...prev, [id]: r.data }));
    } catch { /* silencioso */ }
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.fecha_inicio) {
      toast.error("Nombre y fecha de inicio son obligatorios."); return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        presupuesto_crc: Number(form.presupuesto_crc) || 0,
        fecha_fin: form.fecha_fin || undefined,
      };
      if (editId) {
        await apiClient.patch(`/campanas/${editId}`, payload);
        toast.success("Campaña actualizada.");
      } else {
        await apiClient.post("/campanas", payload);
        const msg = Number(form.presupuesto_crc) > 0
          ? "Campaña creada y gasto registrado en contabilidad ✅"
          : "Campaña creada.";
        toast.success(msg);
      }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditId(null);
      load();
    } catch {
      toast.error("Error al guardar la campaña.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEstado = async (id: number, estado: string) => {
    try {
      await apiClient.patch(`/campanas/${id}`, { estado });
      setCampanas((prev) => prev.map((c) => c.id === id ? { ...c, estado: estado as any } : c));
      toast.success(`Campaña marcada como ${estado}.`);
    } catch { toast.error("No se pudo cambiar el estado."); }
  };

  const handleEditar = (c: Campana) => {
    setForm({
      nombre: c.nombre,
      plataforma: c.plataforma,
      fecha_inicio: c.fecha_inicio,
      fecha_fin: c.fecha_fin ?? "",
      presupuesto_crc: String(c.presupuesto_crc ?? ""),
      objetivo: c.objetivo ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const activasCount = campanas.filter((c) => c.estado === "Activa").length;
  const totalInvertido = campanas.reduce((s, c) => s + Number(c.presupuesto_crc || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><LuMegaphone size={22} /> Gestión de Campañas</h1>
          <p className={styles.subtitle}>Marketing en redes sociales · Seguimiento de efectividad</p>
        </div>
        <button className="btn btn-principal" onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }); }}>
          + Nueva Campaña
        </button>
      </div>

      {/* Resumen rápido */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{activasCount}</span>
          <span className={styles.statLabel}>Campañas activas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{campanas.length}</span>
          <span className={styles.statLabel}>Total campañas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{fmtCRC(totalInvertido)}</span>
          <span className={styles.statLabel}>Total invertido</span>
        </div>
      </div>

      {/* Lista de campañas */}
      {loading ? (
        <p className={styles.loading}>Cargando campañas...</p>
      ) : campanas.length === 0 ? (
        <div className={styles.empty}>
          <span><LuMegaphone size={28} /></span>
          <p>No hay campañas registradas todavía.</p>
          <button className="btn btn-principal" onClick={() => setShowForm(true)}>Crear primera campaña</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {campanas.map((c) => (
            <div key={c.id} className={styles.campanaCard} onClick={() => loadMetricas(c.id)}>
              <div className={styles.cardHeader}>
                <span
                  className={styles.plataformaBadge}
                  style={{ background: PLATAFORMA_COLORS[c.plataforma] }}
                >
                  {(() => { const Icon = PLATAFORMA_ICONS[c.plataforma]; return <Icon size={14} />; })()} {c.plataforma}
                </span>
                <span
                  className={styles.estadoBadge}
                  style={{ color: ESTADO_COLORS[c.estado], borderColor: ESTADO_COLORS[c.estado] }}
                >
                  {c.estado}
                </span>
              </div>

              <h3 className={styles.campanaNombre}>{c.nombre}</h3>
              {c.objetivo && <p className={styles.objetivo}>{c.objetivo}</p>}

              <div className={styles.cardMeta}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuCalendarDays size={14} /> {fmtFechaLocal(c.fecha_inicio)}{c.fecha_fin ? ` → ${fmtFechaLocal(c.fecha_fin)}` : ""}</span>
                {Number(c.presupuesto_crc) > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <LuWallet size={14} /> {fmtCRC(Number(c.presupuesto_crc))}
                    {c.gasto_id && <span className={styles.gastoTag} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuBookOpenCheck size={13} /> Contabilizado</span>}
                  </span>
                )}
              </div>

              {/* Métricas de conversión */}
              {metricas[c.id] ? (
                <div className={styles.metricas}>
                  <div className={styles.funnel}>
                    <div className={styles.funnelStep}>
                      <span className={styles.funnelNum}>{metricas[c.id].totalLeads}</span>
                      <span className={styles.funnelLabel}>Leads</span>
                    </div>
                    <span className={styles.funnelArrow}>→</span>
                    <div className={styles.funnelStep}>
                      <span className={styles.funnelNum}>{metricas[c.id].cotizaciones}</span>
                      <span className={styles.funnelLabel}>Cotizaciones</span>
                    </div>
                    <span className={styles.funnelArrow}>→</span>
                    <div className={styles.funnelStep} style={{ color: "#16a34a" }}>
                      <span className={styles.funnelNum}>{metricas[c.id].cerrados}</span>
                      <span className={styles.funnelLabel}>Cerrados</span>
                    </div>
                  </div>
                  <div className={styles.metricaExtra}>
                    <span>Conversión: <strong>{metricas[c.id].tasaConversion}%</strong></span>
                    {metricas[c.id].costoPorLead > 0 && (
                      <span>Costo/lead: <strong>{fmtCRC(metricas[c.id].costoPorLead)}</strong></span>
                    )}
                    {metricas[c.id].costoPorCierre > 0 && (
                      <span>Costo/venta: <strong>{fmtCRC(metricas[c.id].costoPorCierre)}</strong></span>
                    )}
                  </div>
                </div>
              ) : (
                <p className={styles.verMetricas}>Haz clic para ver métricas</p>
              )}

              <div className={styles.cardActions}>
                <button className={styles.btnEdit} onClick={(e) => { e.stopPropagation(); handleEditar(c); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <LuPencil size={14} /> Editar
                </button>
                {c.estado === "Activa" && (
                  <button className={styles.btnPausar} onClick={(e) => { e.stopPropagation(); handleEstado(c.id, "Pausada"); }}>
                    ⏸ Pausar
                  </button>
                )}
                {c.estado === "Pausada" && (
                  <button className={styles.btnActivar} onClick={(e) => { e.stopPropagation(); handleEstado(c.id, "Activa"); }}>
                    ▶ Reactivar
                  </button>
                )}
                {c.estado !== "Finalizada" && (
                  <button className={styles.btnFinalizar} onClick={(e) => { e.stopPropagation(); handleEstado(c.id, "Finalizada"); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <LuCircleCheck size={14} /> Finalizar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar campaña */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? "Editar campaña" : "Nueva campaña"}</h2>

            <label>Nombre de la campaña *</label>
            <input
              placeholder="Ej: BYD Atto 3 — Junio 2025"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <label>Plataforma</label>
            <select value={form.plataforma} onChange={(e) => setForm({ ...form, plataforma: e.target.value })}>
              {["Facebook", "Instagram", "TikTok", "Otro"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <div className={styles.row2}>
              <div>
                <label>Fecha inicio *</label>
                <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
              <div>
                <label>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
              </div>
            </div>

            <label>
              Presupuesto invertido (₡)
              {!editId && Number(form.presupuesto_crc) > 0 && (
                <span className={styles.contabilidadHint}>→ Se registrará automáticamente en Contabilidad como gasto de Publicidad</span>
              )}
            </label>
            <input
              type="number"
              placeholder="0"
              value={form.presupuesto_crc}
              onChange={(e) => setForm({ ...form, presupuesto_crc: e.target.value })}
            />

            <label>Objetivo (opcional)</label>
            <textarea
              rows={2}
              placeholder="Ej: Generar 20 leads para BYD Atto 3"
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
            />

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-principal" onClick={handleSubmit} disabled={guardando}>
                {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Crear campaña"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
