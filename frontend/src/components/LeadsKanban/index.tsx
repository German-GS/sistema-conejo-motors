import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./LeadsKanban.module.css";

interface LeadCard {
  id: number;
  nombre_cliente: string;
  estado: string;
  fuente: string;
  fecha_followup?: string;
  vehiculo_interes?: { marca: string; modelo: string };
  vendedor_asignado?: { nombre_completo: string };
}

interface Props {
  leads: LeadCard[];
  basePath: string;
  isAdmin: boolean;
  onMove: (leadId: number, nuevoEstado: string) => void;
}

// Columnas del embudo en orden
const COLUMNAS = [
  "Nuevo", "Contactado", "En Progreso", "Prueba de Manejo",
  "Cotizacion Enviada", "Negociacion", "Cerrado", "Perdido",
];

const COLOR: Record<string, string> = {
  Nuevo: "#3b82f6", Contactado: "#f59e0b", "En Progreso": "#8b5cf6",
  "Prueba de Manejo": "#06b6d4", "Cotizacion Enviada": "#0891b2",
  Negociacion: "#d97706", Cerrado: "#10b981", Perdido: "#ef4444",
};

const FUENTE_ICONS: Record<string, string> = {
  Web: "🌐", Instagram: "📸", Facebook: "👍", WhatsApp: "💬",
  TikTok: "🎵", Referido: "🤝", Presencial: "🏢", Llamada: "📞", Otro: "📋",
};

export const LeadsKanban = ({ leads, basePath, isAdmin, onMove }: Props) => {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const hoy = new Date();

  return (
    <div className={styles.board}>
      {COLUMNAS.map((col) => {
        const items = leads.filter((l) => l.estado === col);
        return (
          <div
            key={col}
            className={`${styles.column} ${overCol === col ? styles.columnOver : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              if (dragId != null) {
                const lead = leads.find((l) => l.id === dragId);
                if (lead && lead.estado !== col) onMove(dragId, col);
              }
              setDragId(null);
            }}
          >
            <div className={styles.colHeader}>
              <span className={styles.dot} style={{ background: COLOR[col] }} />
              {col}
              <span className={styles.count}>{items.length}</span>
            </div>
            <div className={styles.cards}>
              {items.length === 0 ? (
                <div className={styles.emptyCol}>—</div>
              ) : (
                items.map((lead) => {
                  const followup = lead.fecha_followup ? new Date(lead.fecha_followup) : null;
                  const vencido = followup && followup < hoy && lead.estado !== "Cerrado" && lead.estado !== "Perdido";
                  return (
                    <div
                      key={lead.id}
                      className={`${styles.card} ${dragId === lead.id ? styles.cardDragging : ""} ${vencido ? styles.cardAlert : ""}`}
                      style={{ "--accent": COLOR[col] } as React.CSSProperties}
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    >
                      <div className={styles.name}>{lead.nombre_cliente}</div>
                      <div className={styles.meta}>
                        <span>{FUENTE_ICONS[lead.fuente] ?? "📋"} {lead.fuente}</span>
                        {lead.vehiculo_interes && (
                          <span>🚗 {lead.vehiculo_interes.marca} {lead.vehiculo_interes.modelo}</span>
                        )}
                        {isAdmin && (
                          <span>👤 {lead.vendedor_asignado?.nombre_completo ?? "Sin asignar"}</span>
                        )}
                        {followup && (
                          <span className={vencido ? styles.followAlert : ""}>
                            {vencido ? "⚠️" : "📅"} {followup.toLocaleDateString("es-CR")}
                          </span>
                        )}
                      </div>
                      <div className={styles.cardActions}>
                        <Link to={`${basePath}/leads/${lead.id}`} className={styles.verBtn}>Ver detalle →</Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
