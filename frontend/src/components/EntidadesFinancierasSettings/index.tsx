import { useState, useEffect } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuSettings, LuLandmark, LuFileText, LuX, LuUpload } from "react-icons/lu";

interface DocEntidad {
  id: number;
  nombre: string;
  url: string;
  tipo_mime?: string;
  tamano_bytes: number;
}
interface Entidad {
  id: number;
  nombre: string;
  activa: boolean;
  orden: number;
  documentos: DocEntidad[];
}

export const EntidadesFinancierasSettings = () => {
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [nuevaEntidad, setNuevaEntidad] = useState("");
  const [creando, setCreando] = useState(false);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [nombreDoc, setNombreDoc] = useState<Record<number, string>>({});

  const cargar = () => {
    apiClient.get("/entidades-financieras")
      .then((r) => setEntidades(r.data))
      .catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  const seed = async () => {
    try {
      const { data } = await apiClient.post("/entidades-financieras/seed");
      toast.success(data.seeded > 0 ? `${data.seeded} entidades creadas.` : "Ya existen entidades.");
      cargar();
    } catch { toast.error("Error al inicializar."); }
  };

  const crear = async () => {
    if (!nuevaEntidad.trim()) return;
    setCreando(true);
    try {
      await apiClient.post("/entidades-financieras", { nombre: nuevaEntidad.trim() });
      setNuevaEntidad("");
      toast.success("Entidad agregada.");
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al crear."); }
    finally { setCreando(false); }
  };

  const toggleActiva = async (e: Entidad) => {
    try {
      await apiClient.patch(`/entidades-financieras/${e.id}`, { activa: !e.activa });
      cargar();
    } catch { toast.error("Error al actualizar."); }
  };

  const eliminar = async (e: Entidad) => {
    if (!window.confirm(`¿Eliminar "${e.nombre}" y sus documentos?`)) return;
    try {
      await apiClient.delete(`/entidades-financieras/${e.id}`);
      toast.success("Entidad eliminada.");
      cargar();
    } catch { toast.error("Error al eliminar."); }
  };

  const subirDoc = async (entidadId: number, file?: File) => {
    if (!file) return;
    setSubiendo(entidadId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("nombre", nombreDoc[entidadId]?.trim() || file.name);
      await apiClient.post(`/entidades-financieras/${entidadId}/documentos`, fd);
      setNombreDoc((p) => ({ ...p, [entidadId]: "" }));
      toast.success("Documento subido.");
      cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al subir."); }
    finally { setSubiendo(null); }
  };

  const eliminarDoc = async (docId: number) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    try {
      await apiClient.delete(`/entidades-financieras/documentos/${docId}`);
      toast.success("Documento eliminado.");
      cargar();
    } catch { toast.error("Error al eliminar."); }
  };

  return (
    <div>
      <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1rem" }}>
        Gestioná las entidades financieras y sus formularios (CIC, KYC, etc.). Los documentos quedan disponibles para descargar y enviar al cliente desde el Lead.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <input
          value={nuevaEntidad}
          onChange={(e) => setNuevaEntidad(e.target.value)}
          placeholder="Nombre de la entidad (ej: Banco Nacional)"
          style={{ flex: 1, minWidth: 220, padding: "0.55rem 0.75rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontFamily: "inherit" }}
        />
        <button className="btn btn-principal" onClick={crear} disabled={creando || !nuevaEntidad.trim()}>
          + Agregar entidad
        </button>
        {entidades.length === 0 && (
          <button className="btn btn-secondary" onClick={seed} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuSettings size={16} /> Cargar entidades base</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {entidades.map((e) => (
          <div key={e.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.15rem", background: e.activa ? "#fff" : "#f8fafc", opacity: e.activa ? 1 : 0.7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <strong style={{ fontSize: "1rem", color: "var(--brand-dark)", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuLandmark size={16} /> {e.nombre}</strong>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: e.activa ? "#dcfce7" : "#e2e8f0", color: e.activa ? "#15803d" : "#64748b" }}>
                {e.activa ? "Activa" : "Inactiva"}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
                <button onClick={() => toggleActiva(e)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.8rem", color: "#475569" }}>
                  {e.activa ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => eliminar(e)} style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.8rem", color: "#dc2626" }}>
                  Eliminar
                </button>
              </div>
            </div>

            {/* Documentos */}
            {e.documentos?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {e.documentos.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.4rem 0.7rem" }}>
                    <span style={{ flex: 1, fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuFileText size={14} /> {d.nombre}</span>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "#024f7d", fontWeight: 600 }}>Ver</a>
                    <button onClick={() => eliminarDoc(d.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", fontSize: "0.85rem", display: "inline-flex", alignItems: "center" }}><LuX size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Subir documento */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={nombreDoc[e.id] ?? ""}
                onChange={(ev) => setNombreDoc((p) => ({ ...p, [e.id]: ev.target.value }))}
                placeholder="Nombre del formulario (ej: CIC)"
                style={{ flex: 1, minWidth: 160, padding: "0.4rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", fontFamily: "inherit" }}
              />
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", border: "1.5px dashed #94a3b8", borderRadius: 8, padding: "0.4rem 0.8rem", cursor: subiendo === e.id ? "wait" : "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569", background: "#fff" }}>
                {subiendo === e.id ? "Subiendo…" : <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuUpload size={14} /> Subir formulario</span>}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(ev) => { subirDoc(e.id, ev.target.files?.[0]); ev.target.value = ""; }}
                  disabled={subiendo === e.id}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
