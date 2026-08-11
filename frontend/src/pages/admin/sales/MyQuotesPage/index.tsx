import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import apiClient from "@/api/apiClient";
import styles from "./MyQuotesPage.module.css";
import { Pagination } from "@/components/Pagination";
import { fmtFecha, fmtFechaLocal } from "@/utils/dateUtils";
import { useConfirm } from "@/components/ConfirmDialog";
import toast from "react-hot-toast";
import { LuLink, LuTriangleAlert, LuClock, LuBan, LuX, LuFileText } from "react-icons/lu";

interface Quote {
  id: number;
  fecha_creacion: string;
  fecha_expiracion: string;
  estado: string;
  precio_lista: number;
  descuento_monto: number;
  precio_final: number;
  gasto_marchamo: number;
  gasto_inscripcion: number;
  gasto_placas: number;
  gasto_otros: number;
  regalias?: string;
  cliente: { nombre_completo: string; cedula: string; telefono?: string };
  vehiculo: { id: number; marca: string; modelo: string; año: number; color?: string };
  vendedor?: { nombre_completo: string };
  lead?: { id: number } | null;
}

const fmtCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

const ESTADO_COLORS: Record<string, string> = {
  Borrador:   "var(--info)",
  Enviada:    "#3b82f6",
  Aceptada:   "#10b981",
  Rechazada:  "#ef4444",
  Facturada:  "#8b5cf6",
  Cancelada:  "var(--danger)",
};

/** "Borrador" se muestra como "Generada" en toda la UI */
const labelEstado = (e: string) => e === "Borrador" ? "Generada" : e;

/** Modal de cancelación */
interface CancelModal {
  quoteId: number;
  cliente: string;
  vehiculo: string;
}

export const MyQuotesPage = () => {
  const confirm = useConfirm();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("Todas");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Modal de cancelación
  const [cancelModal, setCancelModal] = useState<CancelModal | null>(null);
  const [motivo, setMotivo] = useState("");
  const [cancelando, setCancelando] = useState(false);

  // Eliminación de canceladas
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const basePath = isAdmin ? "/admin/sales" : "/sales";
  // Admin ve TODAS las cotizaciones, vendedor solo las suyas
  const endpoint = isAdmin ? "/quotes" : "/quotes/my";

  const loadQuotes = () => {
    setLoading(true);
    apiClient.get(endpoint)
      .then((res) => setQuotes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuotes(); }, [endpoint]);

  const handleEliminar = async (id: number) => {
    const ok = await confirm({
      title: "Eliminar cotización",
      message: `¿Eliminar cotización #${id}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setEliminandoId(id);
    try {
      await apiClient.delete(`/quotes/${id}`);
      toast.success(`Cotización #${id} eliminada.`);
      loadQuotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al eliminar.");
    } finally {
      setEliminandoId(null);
    }
  };

  const handleCancelar = async () => {
    if (!cancelModal) return;
    if (!motivo.trim()) { toast.error("Por favor ingresa un motivo de cancelación."); return; }
    setCancelando(true);
    try {
      await apiClient.patch(`/quotes/${cancelModal.quoteId}/cancelar`, { motivo });
      toast.success("Cotización cancelada y vehículo liberado.");
      setCancelModal(null);
      setMotivo("");
      loadQuotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al cancelar la cotización.");
    } finally {
      setCancelando(false);
    }
  };

  const countByEstado = useMemo(() => quotes.reduce((acc, q) => {
    acc[q.estado] = (acc[q.estado] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>), [quotes]);

  const filtered = useMemo(() => {
    let list = quotes;
    if (filterEstado !== "Todas") list = list.filter(q => q.estado === filterEstado);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(qt =>
        `${qt.cliente.nombre_completo} ${qt.vehiculo.marca} ${qt.vehiculo.modelo} ${qt.id}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [quotes, filterEstado, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const today = new Date();

  return (
    <div>
      {/* Header */}
      <div className={styles.topBar}>
        <h1>{isAdmin ? "Todas las Cotizaciones" : "Mis Cotizaciones"}</h1>
        <span className={styles.total}>{quotes.length} total</span>
      </div>

      {/* KPIs por estado */}
      <div className={styles.kpiRow}>
        <button
          className={`${styles.kpi} ${filterEstado === "Todas" ? styles.kpiActive : ""}`}
          onClick={() => { setFilterEstado("Todas"); setPage(1); }}
        >
          <span className={styles.kpiNum}>{quotes.length}</span>
          <span className={styles.kpiLabel}>Todas</span>
        </button>
        {["Borrador", "Enviada", "Aceptada", "Rechazada", "Facturada", "Cancelada"].map(e => (
          <button
            key={e}
            className={`${styles.kpi} ${filterEstado === e ? styles.kpiActive : ""}`}
            style={{ borderColor: filterEstado === e ? ESTADO_COLORS[e] : undefined }}
            onClick={() => { setFilterEstado(filterEstado === e ? "Todas" : e); setPage(1); }}
          >
            <span className={styles.kpiNum} style={{ color: ESTADO_COLORS[e] }}>
              {countByEstado[e] ?? 0}
            </span>
            <span className={styles.kpiLabel}>{labelEstado(e)}</span>
          </button>
        ))}
      </div>

      {/* Barra de búsqueda */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 Buscar por cliente, vehículo, # cotización..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={styles.searchInput}
        />
        <span className={styles.resultCount}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className={styles.empty}>Cargando cotizaciones...</p>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}><LuFileText size={16} /> No hay cotizaciones que coincidan.</p>
          {(filterEstado !== "Todas" || search) && (
            <button className={styles.clearBtn} onClick={() => { setFilterEstado("Todas"); setSearch(""); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  {isAdmin && <th>Vendedor</th>}
                  <th>Precio Venta</th>
                  <th>Total al Cliente</th>
                  <th>Vence</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((q) => {
                  const totalGastos = [q.gasto_marchamo, q.gasto_inscripcion, q.gasto_placas, q.gasto_otros]
                    .reduce((s, v) => s + Number(v || 0), 0);
                  const vence = new Date(q.fecha_expiracion);
                  const esActiva = q.estado === "Borrador" || q.estado === "Enviada";
                  const vencida = vence < today && esActiva;
                  const venceProx = esActiva && !vencida && (vence.getTime() - today.getTime()) < 3 * 24 * 60 * 60 * 1000;

                  return (
                    <tr key={q.id} className={vencida ? styles.rowExpired : ""}>
                      <td>
                        <span className={styles.quoteId}>#{q.id}</span>
                        {q.lead && (
                          <span className={styles.leadBadge} title={`Lead #${q.lead.id}`} style={{ display: "inline-flex" }}><LuLink size={13} /></span>
                        )}
                      </td>
                      <td className={styles.dateCell}>
                        {fmtFecha(q.fecha_creacion)}
                      </td>
                      <td>
                        <strong>{q.cliente.nombre_completo}</strong>
                        <br />
                        <span className={styles.sub}>{q.cliente.cedula}</span>
                      </td>
                      <td>
                        {q.vehiculo ? (
                          <>
                            <span>{q.vehiculo.marca} {q.vehiculo.modelo}</span>
                            <br />
                            <span className={styles.sub}>{q.vehiculo.año}{q.vehiculo.color ? ` · ${q.vehiculo.color}` : ""}</span>
                          </>
                        ) : <span className={styles.sub}>—</span>}
                      </td>
                      {isAdmin && (
                        <td className={styles.sub}>{q.vendedor?.nombre_completo ?? "—"}</td>
                      )}
                      <td>
                        {fmtCRC(Number(q.precio_final))}
                        {Number(q.descuento_monto) > 0 && (
                          <span className={styles.discountTag}>
                            −{fmtCRC(Number(q.descuento_monto))}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{fmtCRC(Number(q.precio_final))}</strong>
                        {totalGastos > 0 && (
                          <span className={styles.gastosTag} title="Incluye gastos de inscripción desglosados">
                            + insc.
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={vencida ? styles.expired : venceProx ? styles.expiringSoon : styles.dateCell} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          {vencida ? <LuTriangleAlert size={12} /> : venceProx ? <LuClock size={12} /> : null}
                          {fmtFechaLocal(q.fecha_expiracion)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ background: ESTADO_COLORS[q.estado] ?? "var(--slate-500)" }}
                        >
                          {labelEstado(q.estado)}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <Link to={`${basePath}/quotes/${q.id}`} className={styles.viewBtn}>
                          Ver →
                        </Link>
                        {(q.estado === "Borrador" || q.estado === "Enviada") && (
                          <button
                            className={styles.cancelBtn}
                            title="Cancelar cotización"
                            onClick={() => setCancelModal({
                              quoteId: q.id,
                              cliente: q.cliente.nombre_completo,
                              vehiculo: `${q.vehiculo?.marca ?? ""} ${q.vehiculo?.modelo ?? ""} (${q.vehiculo?.año ?? ""})`,
                            })}
                          >
                            <LuX size={13} />
                          </button>
                        )}
                        {q.estado === "Cancelada" && isAdmin && (
                          <button
                            className={styles.cancelBtn}
                            title="Eliminar cotización cancelada"
                            disabled={eliminandoId === q.id}
                            onClick={() => handleEliminar(q.id)}
                          >
                            {eliminandoId === q.id ? "..." : <LuX size={13} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            totalItems={filtered.length}
          />
        </>
      )}

      {/* ── Modal cancelar cotización ── */}
      {cancelModal && (
        <div className={styles.modalOverlay} onClick={() => { setCancelModal(null); setMotivo(""); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalIcon} style={{ display: "inline-flex" }}><LuBan size={24} /></span>
              <div>
                <strong>Cancelar Cotización #{cancelModal.quoteId}</strong>
                <p className={styles.modalSub}>{cancelModal.cliente} — {cancelModal.vehiculo}</p>
              </div>
            </div>
            <p className={styles.modalWarning} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuTriangleAlert size={15} /> Al cancelar, el vehículo quedará <strong>disponible</strong> nuevamente.
            </p>
            <label className={styles.modalLabel}>Motivo de cancelación *</label>
            <textarea
              className={styles.modalTextarea}
              rows={4}
              placeholder="Ej: El cliente desistió de la compra, encontró otro vehículo, no calificó para financiamiento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => { setCancelModal(null); setMotivo(""); }}
                disabled={cancelando}
              >
                No, mantener
              </button>
              <button
                className={styles.modalConfirm}
                onClick={handleCancelar}
                disabled={cancelando || !motivo.trim()}
              >
                {cancelando ? "Cancelando..." : "Sí, cancelar cotización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
