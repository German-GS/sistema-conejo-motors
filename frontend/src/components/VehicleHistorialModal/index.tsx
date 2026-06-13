import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import { Modal } from "@/components/Modal";

interface HistorialItem {
  id: number;
  estado_anterior?: string;
  estado_nuevo: string;
  tipo: string;
  motivo?: string;
  fecha: string;
  usuario?: { nombre_completo?: string; email?: string };
}

interface Props {
  vehicleId: number | null;
  vehicleLabel?: string;
  onClose: () => void;
}

const tipoColor: Record<string, string> = {
  estado: "#024f7d",
  visibilidad: "#7c3aed",
  clasificacion: "#d97706",
};

const fmtFecha = (f: string) =>
  new Date(f).toLocaleString("es-CR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export const VehicleHistorialModal = ({ vehicleId, vehicleLabel, onClose }: Props) => {
  const [items, setItems] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicleId == null) return;
    setLoading(true);
    apiClient
      .get(`/vehicles/${vehicleId}/historial`)
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  return (
    <Modal
      isOpen={vehicleId != null}
      onClose={onClose}
      title={`Historial de estados${vehicleLabel ? ` — ${vehicleLabel}` : ""}`}
    >
      {loading ? (
        <p style={{ padding: "1rem", color: "#64748b" }}>Cargando historial...</p>
      ) : items.length === 0 ? (
        <p style={{ padding: "1rem", color: "#64748b" }}>
          Sin cambios registrados todavía. Las transiciones (reserva, venta, liberación,
          visibilidad) quedarán registradas aquí a partir de ahora.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: "flex", gap: "0.75rem", alignItems: "flex-start",
                borderLeft: `3px solid ${tipoColor[it.tipo] || "#94a3b8"}`,
                paddingLeft: "0.75rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>
                  {it.estado_anterior ? `${it.estado_anterior} → ` : ""}
                  {it.estado_nuevo}
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 500, color: tipoColor[it.tipo] || "#94a3b8",
                    background: (tipoColor[it.tipo] || "#94a3b8") + "1a",
                    borderRadius: 6, padding: "1px 6px", marginLeft: "0.5rem",
                  }}>
                    {it.tipo}
                  </span>
                </div>
                {it.motivo && (
                  <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "0.15rem" }}>{it.motivo}</div>
                )}
                <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                  {fmtFecha(it.fecha)}
                  {it.usuario && ` · ${it.usuario.nombre_completo || it.usuario.email}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
