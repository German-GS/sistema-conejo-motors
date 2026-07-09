import { getImageUrl } from "@/utils/imageUrl";
import React, { useState, useEffect, useRef } from "react";
import apiClient from "../../api/apiClient";
import { Card } from "../../components/Card";
import styles from "./SettingsPage.module.css";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { SiteHomepageSettings } from "../../components/SiteHomepageSettings";
import { EntidadesFinancierasSettings } from "../../components/EntidadesFinancierasSettings";
import { EditProfileModal } from "./EditProfileModal";

// --- INTERFACES ---
interface Parametro {
  id: number;
  nombre: string;
  valor: number;
  descripcion: string;
  tipo:
    | "DEDUCCION_EMPLEADO"
    | "CARGA_PATRONAL"
    | "RENTA"
    | "CREDITO_FISCAL"
    | "COMISION";
}

interface VehicleProfile {
  id: number;
  marca: string;
  modelo: string;
  imagenes?: { url: string }[];
}

// --- COMPONENTES INTERNOS (Helper para la tabla de parámetros) ---
const ParametrosTable: React.FC<any> = ({
  parametros,
  editId,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onValueChange,
}) => {
  if (!parametros || parametros.length === 0) {
    return <p>No hay parámetros de este tipo para mostrar.</p>;
  }
  return (
    <table className={styles.settingsTable}>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Valor</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {parametros.map((param: Parametro) => (
          <tr key={param.id}>
            <td>{param.descripcion}</td>
            <td>
              {editId === param.id ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => onValueChange(parseFloat(e.target.value))}
                  className={styles.valueInput}
                />
              ) : param.tipo.includes("PATRONAL") ||
                param.tipo.includes("EMPLEADO") ||
                param.tipo === "COMISION" ? (
                `${param.valor}%`
              ) : (
                `₡${param.valor.toLocaleString("es-CR")}`
              )}
            </td>
            <td>
              {editId === param.id ? (
                <>
                  <button
                    onClick={() => onSave(param.id)}
                    className={`${styles.actionButton} ${styles.saveButton}`}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={onCancel}
                    className={`${styles.actionButton} ${styles.cancelButton}`}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onEdit(param.id, param.valor)}
                  className={`${styles.actionButton} ${styles.editButton}`}
                >
                  Editar
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// --- COMPONENTE DE CALCULADORA ---
const CalcSettings: React.FC = () => {
  const [tasa, setTasa] = useState(12);
  const [plazo, setPlazo] = useState(60);
  const [primaPct, setPrimaPct] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get("/site-settings/public").then((res) => {
      const s = res.data;
      const get = (key: string, def: number) =>
        Number(s.find((x: any) => x.key === key)?.value ?? def);
      setTasa(get("calc_tasa_default", 12));
      setPlazo(get("calc_plazo_default", 60));
      setPrimaPct(get("calc_prima_pct_default", 20));
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        apiClient.post("/site-settings", { key: "calc_tasa_default",    value: String(tasa) }),
        apiClient.post("/site-settings", { key: "calc_plazo_default",   value: String(plazo) }),
        apiClient.post("/site-settings", { key: "calc_prima_pct_default", value: String(primaPct) }),
      ]);
      toast.success("Parámetros de calculadora guardados.");
    } catch {
      toast.error("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>
        Estos valores se usan como predeterminados cuando el vendedor abre la calculadora de financiamiento.
      </p>
      <div className={styles.calcGrid}>
        <div className={styles.calcField}>
          <label>Tasa anual predeterminada (%)</label>
          <input
            type="number" value={tasa} min={0} max={50} step={0.5}
            onChange={e => setTasa(Number(e.target.value))}
          />
          <p className={styles.calcHint}>Tasa del banco central / financiera típica</p>
        </div>
        <div className={styles.calcField}>
          <label>Plazo predeterminado (meses)</label>
          <select value={plazo} onChange={e => setPlazo(Number(e.target.value))}>
            {[12, 24, 36, 48, 60, 72, 84].map(p => (
              <option key={p} value={p}>{p} meses</option>
            ))}
          </select>
          <p className={styles.calcHint}>Plazo más común ofrecido</p>
        </div>
        <div className={styles.calcField}>
          <label>Prima predeterminada (% del precio)</label>
          <input
            type="number" value={primaPct} min={0} max={80} step={5}
            onChange={e => setPrimaPct(Number(e.target.value))}
          />
          <p className={styles.calcHint}>Porcentaje de enganche recomendado</p>
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn btn-principal" style={{ alignSelf: "flex-start" }}>
        {saving ? "Guardando..." : "Guardar parámetros"}
      </button>
    </div>
  );
};

// --- COMPONENTE DE IMPUESTO (IVA) POR DEFECTO ---
const ImpuestoSettings: React.FC = () => {
  const [iva, setIva] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get("/site-settings/public").then((res) => {
      const v = Number(res.data?.find((x: any) => x.key === "iva_default")?.value);
      if (!isNaN(v)) setIva(v);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post("/site-settings", { key: "iva_default", value: String(iva) });
      toast.success("IVA por defecto guardado.");
    } catch { toast.error("Error al guardar."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>
        Impuesto que se aplica a las cotizaciones nuevas. Actualmente, por la exoneración, es del <strong>4%</strong>; si cambia (sube o baja), actualizalo acá y se usará en las próximas cotizaciones. El vendedor igual puede ajustarlo por cotización si tiene permiso.
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>IVA por defecto (%)</label>
          <input
            type="number" value={iva} min={0} max={13} step={1}
            onChange={(e) => setIva(Number(e.target.value))}
            style={{ width: 140, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "1rem", fontFamily: "inherit" }}
          />
        </div>
        <button onClick={save} disabled={saving} className="btn btn-principal">
          {saving ? "Guardando..." : "Guardar IVA"}
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE DE CONFIGURACIÓN DE LEADS (CRM) ---
const LeadsConfigSettings: React.FC = () => {
  const [dias, setDias] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get("/site-settings/public").then((res) => {
      const v = Number(res.data?.find((x: any) => x.key === "lead_descarte_dias")?.value);
      if (!isNaN(v) && v > 0) setDias(v);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post("/site-settings", { key: "lead_descarte_dias", value: String(dias) });
      toast.success("Configuración guardada.");
    } catch { toast.error("Error al guardar."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>
        Un lead marcado como <strong>Tibio</strong> que no tenga actividad registrada después de su fecha de seguimiento se moverá automáticamente a <strong>Descartado</strong> pasados estos días. Se avisa al vendedor <strong>1 día antes</strong>.
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>Días para auto-descartar leads tibios</label>
          <input
            type="number" value={dias} min={1} max={60} step={1}
            onChange={(e) => setDias(Number(e.target.value))}
            style={{ width: 140, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "1rem", fontFamily: "inherit" }}
          />
        </div>
        <button onClick={save} disabled={saving} className="btn btn-principal">
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
type SeccionConfig = "vehiculos" | "sitio" | "financiamiento" | "planilla" | "crm" | "depreciacion";
const SECCIONES: { id: SeccionConfig; icon: string; label: string; desc: string }[] = [
  { id: "vehiculos",      icon: "🚗", label: "Vehículos",     desc: "Perfiles de modelos y sus especificaciones" },
  { id: "sitio",          icon: "🌐", label: "Sitio Web",     desc: "Página principal y contenido público" },
  { id: "financiamiento", icon: "🏦", label: "Financiamiento", desc: "Entidades, formularios y calculadora" },
  { id: "crm",            icon: "🎯", label: "CRM / Leads",    desc: "Reglas de seguimiento y auto-descarte de leads" },
  { id: "planilla",       icon: "💰", label: "Planilla",      desc: "Comisiones, cargas patronales y deducciones" },
  { id: "depreciacion",   icon: "📉", label: "Depreciación",  desc: "Tabla de vida útil por categoría de activo" },
];

// --- Editor de la tabla de depreciación ---
const DepreciacionConfig: React.FC = () => {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const cargar = () => {
    apiClient.get("/depreciacion/categorias").then((r) => setCats(r.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  const setCampo = (id: number, campo: string, valor: any) =>
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));

  const guardar = async (c: any) => {
    try {
      await apiClient.patch(`/depreciacion/categorias/${c.id}`, {
        nombre: c.nombre, vida_util_meses: Number(c.vida_util_meses) || 0,
        vida_util_fiscal_meses: Number(c.vida_util_fiscal_meses) || 0,
        metodo_fiscal: c.metodo_fiscal || "LineaRecta",
        tasa_anual: Number(c.tasa_anual) || 0, cuenta_activo: c.cuenta_activo, activo: c.activo,
      });
      toast.success("Categoría guardada.");
    } catch { toast.error("Error al guardar."); }
  };
  const agregar = async () => {
    try { const r = await apiClient.post("/depreciacion/categorias", { nombre: "Nueva categoría", vida_util_meses: 120 }); setCats((p) => [...p, r.data]); }
    catch { toast.error("Error al agregar."); }
  };
  const eliminar = async (id: number) => {
    if (!window.confirm("¿Eliminar esta categoría?")) return;
    try { await apiClient.delete(`/depreciacion/categorias/${id}`); setCats((p) => p.filter((c) => c.id !== id)); }
    catch { toast.error("Error al eliminar."); }
  };
  const sembrar = async () => {
    try { const r = await apiClient.post("/depreciacion/categorias/seed"); toast.success(`${r.data.seeded} categorías creadas.`); cargar(); }
    catch { toast.error("Error."); }
  };

  const inp: React.CSSProperties = { padding: "0.35rem 0.5rem", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: "0.82rem", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando…</p>;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <div>
          <strong style={{ fontSize: "1rem", color: "#0a2540" }}>Tabla de depreciación</strong>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b", maxWidth: 620 }}>
            Doble libro: <strong>vida financiera</strong> (NIIF, va al mayor) y <strong>vida fiscal</strong> (Anexo Nº 2 del Decreto 43198-H, solo para renta).
            La tasa anual es la del Anexo. Verificá los valores contra el reglamento vigente.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {cats.length === 0 && <button onClick={sembrar} className={styles.saveButton}>Sembrar tabla</button>}
          <button onClick={agregar} className={styles.saveButton}>+ Agregar</button>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 640 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "6px" }}>Categoría</th>
              <th style={{ padding: "6px", width: 100 }} title="Vida útil contable (NIIF)">Vida financiera</th>
              <th style={{ padding: "6px", width: 100 }} title="Vida útil fiscal (Anexo 2)">Vida fiscal</th>
              <th style={{ padding: "6px", width: 120 }}>Método fiscal</th>
              <th style={{ padding: "6px", width: 80 }}>Tasa %</th>
              <th style={{ padding: "6px", width: 80 }}>Cuenta</th>
              <th style={{ padding: "6px", width: 60 }}>Activa</th>
              <th style={{ padding: "6px", width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px" }}><input value={c.nombre} onChange={(e) => setCampo(c.id, "nombre", e.target.value)} style={inp} /></td>
                <td style={{ padding: "6px" }}><input type="number" value={c.vida_util_meses} onChange={(e) => setCampo(c.id, "vida_util_meses", e.target.value)} style={inp} /></td>
                <td style={{ padding: "6px" }}><input type="number" value={c.vida_util_fiscal_meses ?? ""} onChange={(e) => setCampo(c.id, "vida_util_fiscal_meses", e.target.value)} style={inp} /></td>
                <td style={{ padding: "6px" }}>
                  <select value={c.metodo_fiscal ?? "LineaRecta"} onChange={(e) => setCampo(c.id, "metodo_fiscal", e.target.value)} style={inp}>
                    <option value="LineaRecta">Línea recta</option>
                    <option value="SumaDigitos">Suma de dígitos</option>
                  </select>
                </td>
                <td style={{ padding: "6px" }}><input type="number" value={c.tasa_anual} onChange={(e) => setCampo(c.id, "tasa_anual", e.target.value)} style={inp} /></td>
                <td style={{ padding: "6px" }}><input value={c.cuenta_activo} onChange={(e) => setCampo(c.id, "cuenta_activo", e.target.value)} style={inp} /></td>
                <td style={{ padding: "6px", textAlign: "center" }}><input type="checkbox" checked={c.activo} onChange={(e) => setCampo(c.id, "activo", e.target.checked)} /></td>
                <td style={{ padding: "6px", whiteSpace: "nowrap" }}>
                  <button onClick={() => guardar(c)} style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: "0.75rem", marginRight: 4 }}>Guardar</button>
                  <button onClick={() => eliminar(c.id)} style={{ background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
                </td>
              </tr>
            ))}
            {cats.length === 0 && <tr><td colSpan={8} style={{ padding: "1rem", textAlign: "center", color: "#94a3b8" }}>Sin categorías. Usá "Sembrar tabla" para los valores por defecto.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SettingsPage = () => {
  const confirm = useConfirm();
  const [seccion, setSeccion] = useState<SeccionConfig>("vehiculos");
  // --- ESTADOS DEL COMPONENTE ---
  const [cargasPatronales, setCargasPatronales] = useState<Parametro[]>([]);
  const [deduccionesEmpleado, setDeduccionesEmpleado] = useState<Parametro[]>(
    []
  );
  const [comisiones, setComisiones] = useState<Parametro[]>([]);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [profileImages, setProfileImages] = useState<File[]>([]); // Estado para las imágenes del perfil
  const [creatingProfile, setCreatingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialProfileState = {
    marca: "",
    modelo: "",
    potencia_hp: "",
    autonomia_km: "",
    capacidad_bateria_kwh: "",
    tiempo_carga_dc: "",
    tiempo_carga_ac: "",
    torque_nm: "",
    aceleracion_0_100: "",
    velocidad_maxima: "",
    categoria: "",
    traccion: "",
    largo_mm: "",
    ancho_mm: "",
    alto_mm: "",
    distancia_ejes_mm: "",
    peso_kg: "",
    capacidad_maletero_l: "",
    numero_pasajeros: "",
    colores_disponibles: "",
    seguridad: "",
    interior: "",
    exterior: "",
    tecnologia: "",
  };

  const [newProfile, setNewProfile] = useState(initialProfileState);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);

  // --- FUNCIONES Y EFECTOS ---
  const fetchParametros = async () => {
    try {
      const response = await apiClient.get("/planilla-parametros");
      setCargasPatronales(
        response.data.filter((p: Parametro) => p.tipo === "CARGA_PATRONAL")
      );
      setDeduccionesEmpleado(
        response.data.filter((p: Parametro) => p.tipo === "DEDUCCION_EMPLEADO")
      );
      setComisiones(
        response.data.filter((p: Parametro) => p.tipo === "COMISION")
      );
    } catch (err) {
      setTimeout(() => {
        setError(
          "No se pudo cargar la configuración. Asegúrate de tener permisos de Administrador."
        );
      }, 0);
    }
  };

  const fetchVehicleProfiles = async () => {
    try {
      const response = await apiClient.get("/vehicle-profiles");
      setProfiles(response.data);
    } catch (err) {
      toast.error("No se pudieron cargar los perfiles de vehículos.");
    }
  };

  useEffect(() => {
    fetchParametros();
    fetchVehicleProfiles();
  }, []);

  const handleUpdate = async (id: number) => {
    try {
      await apiClient.patch(`/planilla-parametros/${id}`, { valor: editValue });
      toast.success("Parámetro actualizado con éxito.");
      setEditId(null);
      fetchParametros();
    } catch (err) {
      toast.error("Error al actualizar el parámetro.");
    }
  };

  const handleProfileFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setNewProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProfileImages(Array.from(e.target.files));
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProfile(true);
    try {
      const profileResponse = await apiClient.post("/vehicle-profiles", newProfile);
      const newProfileId = profileResponse.data.id;

      if (profileImages.length > 0) {
        toast.loading(`Subiendo ${profileImages.length} imagen(es)…`, { id: "upload" });
        const imagesFormData = new FormData();
        profileImages.forEach((file) => {
          imagesFormData.append("files", file);
        });
        await apiClient.post(
          `/vehicle-profiles/${newProfileId}/upload-images`,
          imagesFormData
        );
        toast.dismiss("upload");
      }

      toast.success("¡Perfil e imágenes guardados con éxito!");
      setNewProfile(initialProfileState);
      setProfileImages([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchVehicleProfiles();
    } catch (err: any) {
      toast.dismiss("upload");
      const errorMessage =
        err.response?.data?.message || "Error al crear el perfil.";
      toast.error(
        Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage
      );
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleDeleteProfile = async (id: number) => {
    const ok = await confirm({ title: "Eliminar perfil", message: "¿Estás seguro de que deseas eliminar este perfil?", confirmText: "Eliminar", danger: true });
    if (ok) {
      try {
        await apiClient.delete(`/vehicle-profiles/${id}`);
        toast.success("Perfil eliminado.");
        fetchVehicleProfiles();
      } catch (err) {
        toast.error("Error al eliminar el perfil.");
      }
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  const seccionActual = SECCIONES.find((s) => s.id === seccion)!;
  return (
    <>
      {/* Encabezado + navegación por secciones */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0a2540", margin: "0 0 0.25rem" }}>⚙️ Configuración</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>{seccionActual.desc}</p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.75rem" }}>
        {SECCIONES.map((s) => {
          const activa = s.id === seccion;
          return (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1.1rem", borderRadius: 10, cursor: "pointer",
                border: activa ? "1.5px solid #024f7d" : "1.5px solid #e2e8f0",
                background: activa ? "#024f7d" : "#fff",
                color: activa ? "#fff" : "#475569",
                fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit",
                boxShadow: activa ? "0 2px 8px rgba(2,79,125,0.25)" : "none",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

      {seccion === "vehiculos" && (
      <Card title="🧾 Impuesto (IVA) por defecto en cotizaciones">
        <ImpuestoSettings />
      </Card>
      )}

      {seccion === "vehiculos" && (
      <Card title="Perfiles de Modelos de Vehículos">
        <form onSubmit={handleCreateProfile} className={styles.profileForm}>
          {/* Inputs de texto y selects */}
          <input
            name="marca"
            value={newProfile.marca}
            onChange={handleProfileFormChange}
            placeholder="Marca (Ej: BYD)"
            required
            className={styles.formInput}
          />
          <input
            name="modelo"
            value={newProfile.modelo}
            onChange={handleProfileFormChange}
            placeholder="Modelo (Ej: Dolphin)"
            required
            className={styles.formInput}
          />
          <select
            name="categoria"
            value={newProfile.categoria}
            onChange={handleProfileFormChange}
          >
            <option value="">-- Categoría --</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="Pickup">Pickup</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Comercial">Comercial</option>
            <option value="Urbano">Urbano</option>
          </select>
          <select
            name="traccion"
            value={newProfile.traccion}
            onChange={handleProfileFormChange}
          >
            <option value="">-- Tracción --</option>
            <option value="4x2">4x2</option>
            <option value="4x4">4x4</option>
            <option value="AWD">AWD</option>
          </select>
          <select
            name="numero_pasajeros"
            value={newProfile.numero_pasajeros}
            onChange={handleProfileFormChange}
          >
            <option value="">-- Pasajeros --</option>
            <option value="2">2</option>
            <option value="5">5</option>
            <option value="7">7</option>
          </select>
          <input
            name="potencia_hp"
            type="number"
            value={newProfile.potencia_hp}
            onChange={handleProfileFormChange}
            placeholder="Potencia (HP)"
            required
          />
          <input
            name="autonomia_km"
            type="number"
            value={newProfile.autonomia_km}
            onChange={handleProfileFormChange}
            placeholder="Autonomía (km)"
            required
          />
          <input
            name="capacidad_bateria_kwh"
            type="number"
            value={newProfile.capacidad_bateria_kwh}
            onChange={handleProfileFormChange}
            placeholder="Batería (kWh)"
            required
          />
          <input
            name="tiempo_carga_dc"
            type="number"
            value={newProfile.tiempo_carga_dc}
            onChange={handleProfileFormChange}
            placeholder="Carga Rápida (min)"
          />
          <input
            name="tiempo_carga_ac"
            type="number"
            value={newProfile.tiempo_carga_ac}
            onChange={handleProfileFormChange}
            placeholder="Carga Lenta (h)"
          />
          <input
            name="torque_nm"
            type="number"
            value={newProfile.torque_nm}
            onChange={handleProfileFormChange}
            placeholder="Torque (Nm)"
          />
          <input
            name="aceleracion_0_100"
            type="number"
            value={newProfile.aceleracion_0_100}
            onChange={handleProfileFormChange}
            placeholder="Aceleración 0-100 (s)"
          />
          <input
            name="velocidad_maxima"
            type="number"
            value={newProfile.velocidad_maxima}
            onChange={handleProfileFormChange}
            placeholder="Vel. Máxima (km/h)"
          />
          <input
            name="largo_mm"
            type="number"
            value={newProfile.largo_mm}
            onChange={handleProfileFormChange}
            placeholder="Largo (mm)"
          />
          <input
            name="ancho_mm"
            type="number"
            value={newProfile.ancho_mm}
            onChange={handleProfileFormChange}
            placeholder="Ancho (mm)"
          />
          <input
            name="alto_mm"
            type="number"
            value={newProfile.alto_mm}
            onChange={handleProfileFormChange}
            placeholder="Alto (mm)"
          />
          <input
            name="distancia_ejes_mm"
            type="number"
            value={newProfile.distancia_ejes_mm}
            onChange={handleProfileFormChange}
            placeholder="Dist. Ejes (mm)"
          />
          <input
            name="peso_kg"
            type="number"
            value={newProfile.peso_kg}
            onChange={handleProfileFormChange}
            placeholder="Peso (kg)"
          />
          <input
            name="capacidad_maletero_l"
            type="number"
            value={newProfile.capacidad_maletero_l}
            onChange={handleProfileFormChange}
            placeholder="Maletero (L)"
          />

          {/* Textareas */}
          <textarea
            name="colores_disponibles"
            value={newProfile.colores_disponibles}
            onChange={handleProfileFormChange}
            placeholder="Colores disponibles (ej: Rojo, Blanco, Azul)"
            className={styles.fullWidth}
          />
          <textarea
            name="seguridad"
            value={newProfile.seguridad}
            onChange={handleProfileFormChange}
            placeholder="Características de seguridad (ej: 6 airbags, Frenos ABS)"
            className={styles.fullWidth}
          />
          <textarea
            name="interior"
            value={newProfile.interior}
            onChange={handleProfileFormChange}
            placeholder="Características interiores (ej: Asientos de cuero, Pantalla táctil)"
            className={styles.fullWidth}
          />
          <textarea
            name="exterior"
            value={newProfile.exterior}
            onChange={handleProfileFormChange}
            placeholder="Características exteriores (ej: Faros LED, Techo panorámico)"
            className={styles.fullWidth}
          />
          <textarea
            name="tecnologia"
            value={newProfile.tecnologia}
            onChange={handleProfileFormChange}
            placeholder="Características de tecnología (ej: Carga inalámbrica, Android Auto)"
            className={styles.fullWidth}
          />

          {/* Input de archivo */}
          <div className={`${styles.fileInputContainer} ${styles.fullWidth}`}>
            <label htmlFor="logo-upload" className={styles.fileInputLabel}>
              {profileImages.length > 0
                ? `${profileImages.length} imágen(es) seleccionada(s) — haz clic para cambiar`
                : "Añadir Fotos del Modelo (hasta 10)"}
            </label>
            <input
              id="logo-upload"
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              accept="image/*"
              multiple
            />
          </div>

          {/* Previsualización de imágenes seleccionadas */}
          {profileImages.length > 0 && (
            <div className={`${styles.fullWidth}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {profileImages.map((file, index) => (
                <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #024f7d' }}
                  />
                  <button
                    type="button"
                    onClick={() => setProfileImages(prev => prev.filter((_, i) => i !== index))}
                    style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: '#e53e3e', color: 'white', border: 'none',
                      borderRadius: '50%', width: '20px', height: '20px',
                      cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center', padding: 0
                    }}
                    title="Quitar esta imagen"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-principal ${styles.fullWidth}`}
            disabled={creatingProfile}
            style={{ opacity: creatingProfile ? 0.75 : 1, cursor: creatingProfile ? "not-allowed" : "pointer" }}
          >
            {creatingProfile
              ? profileImages.length > 0
                ? `⏳ Subiendo ${profileImages.length} imagen(es)…`
                : "⏳ Creando perfil…"
              : "Añadir Perfil"}
          </button>
        </form>

        {/* Tabla de perfiles existentes */}
        <table className={styles.settingsTable} style={{ marginTop: "2rem" }}>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td>
                  {/* Revisa si hay imágenes y muestra la primera */}
                  {profile.imagenes && profile.imagenes.length > 0 ? (
                    <img
                      src={getImageUrl(profile.imagenes[0].url)}
                      alt={profile.marca}
                      className={styles.logoImage} // Reutilizamos el estilo del logo para la miniatura
                    />
                  ) : (
                    <div className={styles.noLogo}>Sin imagen</div> // Mensaje actualizado
                  )}
                </td>
                <td>{profile.marca}</td>
                <td>{profile.modelo}</td>
                <td>
                  <div className={styles.actionGroup}>
                    <button
                      onClick={() => setEditingProfileId(profile.id)}
                      className={`${styles.actionButton} ${styles.editButton}`}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      )}

      {seccion === "sitio" && (
      <Card title="Configuración de Página Principal">
        <SiteHomepageSettings />
      </Card>
      )}

      {seccion === "financiamiento" && (
      <>
        <Card title="🏦 Entidades Financieras y sus Documentos">
          <EntidadesFinancierasSettings />
        </Card>

        <Card title="🧮 Calculadora de Financiamiento — Parámetros predeterminados">
          <CalcSettings />
        </Card>
      </>
      )}

      {seccion === "crm" && (
      <Card title="🎯 Auto-descarte de leads tibios">
        <LeadsConfigSettings />
      </Card>
      )}

      {seccion === "depreciacion" && (
      <Card title="📉 Tabla de depreciación por categoría de activo">
        <DepreciacionConfig />
      </Card>
      )}

      {seccion === "planilla" && (
      <>
        <div className={styles.highlightCard}>
          <Card title="Parámetros de Comisiones">
            <ParametrosTable
              parametros={comisiones}
              editId={editId}
              editValue={editValue}
              onEdit={(id: number, value: number) => {
                setEditId(id);
                setEditValue(value);
              }}
              onCancel={() => setEditId(null)}
              onSave={handleUpdate}
              onValueChange={setEditValue}
            />
          </Card>
        </div>

        <Card title="Obligaciones del Patrono (Planilla)">
          <ParametrosTable
            parametros={cargasPatronales}
            editId={editId}
            editValue={editValue}
            onEdit={(id: number, value: number) => {
              setEditId(id);
              setEditValue(value);
            }}
            onCancel={() => setEditId(null)}
            onSave={handleUpdate}
            onValueChange={setEditValue}
          />
        </Card>

        <Card title="Deducciones del Colaborador (Planilla)">
          <ParametrosTable
            parametros={deduccionesEmpleado}
            editId={editId}
            editValue={editValue}
            onEdit={(id: number, value: number) => {
              setEditId(id);
              setEditValue(value);
            }}
            onCancel={() => setEditId(null)}
            onSave={handleUpdate}
            onValueChange={setEditValue}
          />
        </Card>
      </>
      )}

      {/* Modal de edición de perfil */}
      {editingProfileId !== null && (
        <EditProfileModal
          profileId={editingProfileId}
          onClose={() => setEditingProfileId(null)}
          onSaved={() => { fetchVehicleProfiles(); setEditingProfileId(null); }}
        />
      )}
    </>
  );
};
