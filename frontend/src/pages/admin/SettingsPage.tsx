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

// --- COMPONENTE DE FINANCIAMIENTO DEL SOCIO (cuentas puente + reclasificación) ---
const FinanciamientoSocioSettings: React.FC = () => {
  const [puente, setPuente] = useState("2900");
  const [destino, setDestino] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get("/site-settings/public").then((res) => {
      const get = (k: string, d = "") => res.data?.find((x: any) => x.key === k)?.value ?? d;
      setPuente(get("cuenta_financiamiento_socio", "2900"));
      setDestino(get("cuenta_destino_socio", ""));
    }).catch(() => {});
  }, []);

  const guardar = async () => {
    try {
      await Promise.all([
        apiClient.post("/site-settings", { key: "cuenta_financiamiento_socio", value: puente.trim() }),
        apiClient.post("/site-settings", { key: "cuenta_destino_socio", value: destino.trim() }),
      ]);
      toast.success("Cuentas guardadas.");
    } catch { toast.error("Error al guardar."); }
  };

  const accion = async (url: string, label: string) => {
    setBusy(true);
    const tId = toast.loading(`${label}…`);
    try {
      const r = await apiClient.post(url, {});
      const d = r.data;
      if (d.yaEjecutado) toast(d.mensaje, { id: tId, icon: "ℹ️" });
      else if (d.sinNegativos || d.sinSaldo) toast(d.mensaje, { id: tId, icon: "ℹ️" });
      else toast.success(`Listo. ${d.total ? `Movió ₡${Number(d.total).toLocaleString("es-CR")}` : d.monto ? `Movió ₡${Number(d.monto).toLocaleString("es-CR")}` : ""}`, { id: tId });
    } catch (e: any) { toast.error(e.response?.data?.message || "Error.", { id: tId }); }
    finally { setBusy(false); }
  };

  const inp: React.CSSProperties = { width: 160, padding: "0.5rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 10, padding: "0.8rem 1rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
        Los gastos que pagó el dueño de su bolsillo se registran contra una <strong>cuenta puente</strong> (financiamiento del socio) en vez de Caja/Banco. Tras la reunión, se reclasifican al destino (préstamo o aporte de capital).
        <br /><strong>Importante:</strong> creá primero las cuentas en el plan de cuentas (Contabilidad); acá solo se indican por código.
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <label style={lbl}>Cuenta puente (financiamiento del socio)</label>
          <input style={inp} value={puente} onChange={(e) => setPuente(e.target.value)} placeholder="2900" />
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>Ej: 2900 (por clasificar)</div>
        </div>
        <div>
          <label style={lbl}>Cuenta destino (post-reunión)</label>
          <input style={inp} value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="2150 o 3150" />
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>2150 préstamo (pasivo) / 3150 aporte (patrimonio)</div>
        </div>
      </div>
      <button onClick={guardar} className="btn btn-principal" style={{ alignSelf: "flex-start" }}>💾 Guardar cuentas</button>

      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button disabled={busy} onClick={() => accion("/contabilidad/reclasificar-caja-a-socio", "Reclasificando caja")}
          style={{ background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.6rem 1.1rem", cursor: "pointer", fontWeight: 700 }}>
          1️⃣ Reclasificar Caja/Banco negativos → socio
        </button>
        <button disabled={busy} onClick={() => accion("/contabilidad/reclasificar-socio-a-destino", "Reclasificando al destino")}
          style={{ background: "#059669", border: "none", color: "#fff", borderRadius: 8, padding: "0.6rem 1.1rem", cursor: "pointer", fontWeight: 700 }}>
          2️⃣ Reclasificar socio → destino (post-reunión)
        </button>
      </div>
      <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
        El paso 1 lleva los saldos negativos de Caja/Banco a la cuenta puente. El paso 2 (después de decidir en la reunión) vacía la puente al destino configurado. Ambas son idempotentes (no duplican en el día).
      </p>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
type SeccionConfig = "vehiculos" | "sitio" | "financiamiento" | "planilla" | "crm" | "depreciacion" | "facturacion" | "contabilidad";
const SECCIONES: { id: SeccionConfig; icon: string; label: string; desc: string }[] = [
  { id: "vehiculos",      icon: "🚗", label: "Vehículos",     desc: "Perfiles de modelos y sus especificaciones" },
  { id: "sitio",          icon: "🌐", label: "Sitio Web",     desc: "Página principal y contenido público" },
  { id: "financiamiento", icon: "🏦", label: "Financiamiento", desc: "Entidades, formularios y calculadora" },
  { id: "facturacion",    icon: "🧾", label: "Facturación",   desc: "Datos del emisor y previsualización de comprobantes electrónicos" },
  { id: "contabilidad",   icon: "🧮", label: "Contabilidad",  desc: "Financiamiento del socio y reclasificación de cuentas" },
  { id: "crm",            icon: "🎯", label: "CRM / Leads",    desc: "Reglas de seguimiento y auto-descarte de leads" },
  { id: "planilla",       icon: "💰", label: "Planilla",      desc: "Comisiones, cargas patronales y deducciones" },
  { id: "depreciacion",   icon: "📉", label: "Depreciación",  desc: "Tabla de vida útil por categoría de activo" },
];

// --- COMPONENTE DE FACTURACIÓN ELECTRÓNICA (emisor + previsualización) ---
const FacturacionSettings: React.FC = () => {
  const [emisor, setEmisor] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get("/billing/emisor").then((r) => setEmisor(r.data)).catch(() => toast.error("No se pudo cargar la configuración del emisor."));
  }, []);

  const set = (campo: string, valor: string) => setEmisor((e: any) => ({ ...e, [campo]: valor }));

  const guardar = async () => {
    setSaving(true);
    try {
      await apiClient.put("/billing/emisor", emisor);
      toast.success("Datos del emisor guardados.");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Error al guardar.");
    } finally { setSaving(false); }
  };

  // El preview requiere el token → se descarga con apiClient y se abre como blob.
  const verEjemplo = async (tipo: "factura" | "tiquete" | "proforma") => {
    const tId = toast.loading("Generando ejemplo…");
    try {
      const res = await apiClient.get(`/billing/preview-demo?tipo=${tipo}`, { responseType: "text" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/html" }));
      window.open(url, "_blank");
      toast.dismiss(tId);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error("No se pudo generar el ejemplo.", { id: tId }); }
  };

  if (!emisor) return <p style={{ color: "#94a3b8" }}>Cargando…</p>;

  const inp: React.CSSProperties = { width: "100%", padding: "0.5rem 0.6rem", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" };
  const Field = ({ campo, label, ph, hint }: { campo: string; label: string; ph?: string; hint?: string }) => (
    <div>
      <label style={lbl}>{label}</label>
      <input style={inp} value={emisor[campo] ?? ""} placeholder={ph} onChange={(e) => set(campo, e.target.value)} />
      {hint && <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 10, padding: "0.7rem 1rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
        <strong>Modo interino:</strong> los comprobantes salen como <strong>BORRADOR no válido fiscalmente</strong> hasta cargar el certificado <code>.p12</code>. Estos datos ya alimentan la clave numérica y el XML v4.4.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <Field campo="razon_social" label="Razón social (legal)" ph="Ej: Guachiplaza S.A." hint="Va en Emisor.Nombre" />
        <Field campo="nombre_comercial" label="Nombre comercial (fantasía)" ph="Conejo Motors" />
        <Field campo="cedula" label="Cédula jurídica" ph="3101857775" hint="Solo dígitos" />
        <div>
          <label style={lbl}>Tipo de identificación</label>
          <select style={inp} value={emisor.tipo_identificacion ?? "02"} onChange={(e) => set("tipo_identificacion", e.target.value)}>
            <option value="01">01 — Física</option>
            <option value="02">02 — Jurídica</option>
            <option value="03">03 — DIMEX</option>
            <option value="04">04 — NITE</option>
          </select>
        </div>
        <Field campo="actividad_economica" label="Código de actividad económica" ph="451000" hint="TRIBU-CR (v4.4)" />
        <Field campo="sucursal" label="Sucursal" ph="001" hint="3 dígitos" />
        <Field campo="terminal" label="Terminal" ph="00001" hint="5 dígitos" />
        <Field campo="provincia" label="Provincia (código)" ph="1" />
        <Field campo="canton" label="Cantón (código)" ph="01" />
        <Field campo="distrito" label="Distrito (código)" ph="01" />
        <Field campo="telefono" label="Teléfono" ph="22000000" />
        <Field campo="email" label="Correo de facturación" ph="contabilidad@conejomotors.com" />
      </div>
      <div>
        <label style={lbl}>Otras señas / dirección exacta</label>
        <input style={inp} value={emisor.otras_senas ?? ""} onChange={(e) => set("otras_senas", e.target.value)} placeholder="Ej: 200m norte del parque, edificio azul" />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={guardar} disabled={saving} className="btn btn-principal">{saving ? "Guardando…" : "💾 Guardar datos del emisor"}</button>
        <span style={{ width: 1, height: 24, background: "#e2e8f0" }} />
        <button onClick={() => verEjemplo("factura")} style={{ background: "#fff", border: "1.5px solid #024f7d", color: "#024f7d", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700 }}>👁️ Factura de ejemplo</button>
        <button onClick={() => verEjemplo("tiquete")} style={{ background: "#fff", border: "1.5px solid #024f7d", color: "#024f7d", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700 }}>👁️ Tiquete de ejemplo</button>
        <button onClick={() => verEjemplo("proforma")} style={{ background: "#fff", border: "1.5px solid #64748b", color: "#475569", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700 }}>👁️ Proforma de ejemplo</button>
      </div>
      <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>
        Los ejemplos usan datos ficticios con tus datos de emisor reales, para ver cómo se ve el comprobante impreso. Las cotizaciones reales generan su Proforma PDF desde el detalle de la cotización.
      </p>
    </div>
  );
};

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
  const btnNavy: React.CSSProperties = { background: "#024f7d", border: "none", color: "#fff", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" };

  if (loading) return <p style={{ color: "#94a3b8" }}>Cargando…</p>;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <div>
          <strong style={{ fontSize: "1rem", color: "#0a2540" }}>Tabla de depreciación</strong>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b", maxWidth: 620 }}>
            Doble libro: <strong>vida financiera</strong> (NIIF, va al mayor) y <strong>vida fiscal</strong> (Anexo Nº 2 del Decreto 43198-H, solo para renta).
            La tasa anual es la del Anexo. Verificá los valores contra el reglamento vigente.
            <br />
            <span style={{ color: "#b45309" }}>ℹ️ La vida útil se ingresa en <strong>meses</strong>, pero la tabla de Hacienda la muestra en <strong>años</strong>: multiplicá por 12 (10 años = 120 meses). Debajo de cada valor se muestra el equivalente en años.</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {cats.length === 0 && <button onClick={sembrar} style={btnNavy}>Sembrar tabla</button>}
          <button onClick={agregar} style={btnNavy}>+ Agregar</button>
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
                <td style={{ padding: "6px" }}>
                  <input type="number" value={c.vida_util_meses} onChange={(e) => setCampo(c.id, "vida_util_meses", e.target.value)} style={inp} />
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>{(Number(c.vida_util_meses) / 12).toFixed(Number(c.vida_util_meses) % 12 === 0 ? 0 : 1)} años</div>
                </td>
                <td style={{ padding: "6px" }}>
                  <input type="number" value={c.vida_util_fiscal_meses ?? ""} onChange={(e) => setCampo(c.id, "vida_util_fiscal_meses", e.target.value)} style={inp} />
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>{c.vida_util_fiscal_meses ? `${(Number(c.vida_util_fiscal_meses) / 12).toFixed(Number(c.vida_util_fiscal_meses) % 12 === 0 ? 0 : 1)} años` : "—"}</div>
                </td>
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

      {seccion === "facturacion" && (
      <Card title="🧾 Facturación Electrónica — Datos del emisor y ejemplos">
        <FacturacionSettings />
      </Card>
      )}

      {seccion === "contabilidad" && (
      <Card title="🧮 Financiamiento del socio (gastos pagados por el dueño)">
        <FinanciamientoSocioSettings />
      </Card>
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
