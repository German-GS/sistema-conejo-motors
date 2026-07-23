import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card";
import styles from "./CreateQuotePage.module.css";
import toast from "react-hot-toast";
import { PageLoader } from "@/components/PageLoader";

interface VehicleDetails {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  precio_venta: number;
  precio_venta_final: number | null;
  descuento_porcentaje: number | null;
  marchamo?: number;
  inscripcion_traspaso?: number;
  /** Valor FINAL del vehículo en dólares (IVA incluido). Habilita la vista en USD. */
  precio_venta_usd?: number;
}

const fmtCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);
const fmtUSD = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

export const CreateQuotePage = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("leadId");
  const basePath = location.pathname.startsWith("/admin") ? "/admin/sales" : "/sales";

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [cliente, setCliente] = useState({ nombre_completo: "", cedula: "", email: "", telefono: "" });
  const [precioLista, setPrecioLista] = useState(0);
  const [descuentoMonto, setDescuentoMonto] = useState(0);
  const [fechaExpiracion, setFechaExpiracion] = useState("");

  // Gastos de inscripción
  const [gastoMarchamo, setGastoMarchamo] = useState(0);
  const [gastoInscripcion, setGastoInscripcion] = useState(0);
  const [gastoPlacas, setGastoPlacas] = useState(0);
  const [gastoOtros, setGastoOtros] = useState(0);
  const [gastoOtrosDesc, setGastoOtrosDesc] = useState("");

  // Extras
  const [regalias, setRegalias] = useState("");
  const [notasCliente, setNotasCliente] = useState("");

  // Medio de contacto (solo si no viene de un lead existente)
  const [fuenteLead, setFuenteLead] = useState("Presencial");

  // IVA — por defecto 4% (exoneración actual); configurable desde Configuración
  const [ivaPorcentaje, setIvaPorcentaje] = useState(4);

  // Cargar el IVA por defecto configurado
  useEffect(() => {
    apiClient.get("/site-settings/public").then((res) => {
      const v = Number(res.data?.find((x: any) => x.key === "iva_default")?.value);
      if (!isNaN(v)) setIvaPorcentaje(v);
    }).catch(() => {});
  }, []);

  // Tipo de combustible (requerido por bancos para financiamiento)
  const [tipoCombustible, setTipoCombustible] = useState("Electrico");

  // Rol del usuario — solo Admin puede cambiar IVA
  const [rolActual, setRolActual] = useState("");
  useEffect(() => {
    try {
      const tok = localStorage.getItem("accessToken");
      if (tok) {
        const d = jwtDecode<{ rol?: { nombre: string } }>(tok);
        setRolActual(d.rol?.nombre || "");
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (!vehicleId) return;
    apiClient.get(`/vehicles/${vehicleId}`)
      .then((res) => {
        const v = res.data;
        setVehicle(v);
        const lista = Number(v.precio_venta_final ?? v.precio_venta);
        setPrecioLista(lista);
        const usd = Number(v.precio_venta_usd) || 0;
        if (usd > 0) {
          setPrecioUsd(usd);
          setMonedaVenta("USD"); // el precio del vehículo está fijado en dólares → venta en USD
          setVerEnUsd(true);     // el resumen abre mostrando dólares
        }
        if (v.marchamo) setGastoMarchamo(Number(v.marchamo));
        if (v.inscripcion_traspaso) setGastoInscripcion(Number(v.inscripcion_traspaso));
      })
      .catch(() => toast.error("No se pudieron cargar los detalles del vehículo."))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const [leadNombre, setLeadNombre] = useState("");
  const [verEnUsd, setVerEnUsd] = useState(false); // toggle ₡/$ del resumen

  // ── Venta en dólares (precio fijo en USD como fuente de verdad) ──────────────
  const [monedaVenta, setMonedaVenta] = useState<"CRC" | "USD">("CRC");
  const [precioUsd, setPrecioUsd] = useState(0);    // precio de lista en USD (IVA incluido, antes de descuento)
  const [descuentoUsd, setDescuentoUsd] = useState(0); // descuento en USD
  const [tcVigente, setTcVigente] = useState(0);    // TC de venta del día (vista previa; se congela al guardar)

  // TC vigente para la vista previa CRC (se congela en el servidor al guardar).
  useEffect(() => {
    apiClient.get("/tipo-cambio/actual")
      .then((r) => setTcVigente(Number(r.data?.venta) || 0))
      .catch(() => {});
  }, []);

  // En modo USD, el CRC (precio y descuento) se deriva del USD × TC vigente (previsualización).
  useEffect(() => {
    if (monedaVenta === "USD" && tcVigente > 0) {
      if (precioUsd > 0) setPrecioLista(Math.round(precioUsd * tcVigente));
      setDescuentoMonto(Math.round(descuentoUsd * tcVigente));
    }
  }, [monedaVenta, precioUsd, descuentoUsd, tcVigente]);

  // Pre-llenar datos del cliente desde el lead
  useEffect(() => {
    if (!leadId) return;
    apiClient.get(`/leads/${leadId}`).then((res) => {
      const lead = res.data;
      setLeadNombre(lead.nombre_cliente || "");
      setCliente(prev => ({
        ...prev,
        nombre_completo: prev.nombre_completo || lead.nombre_cliente || "",
        cedula: prev.cedula || lead.cedula_cliente || "",
        email: prev.email || lead.email_cliente || "",
        telefono: prev.telefono || lead.telefono_cliente || lead.whatsapp_cliente || "",
      }));
    }).catch(() => {});
  }, [leadId]);

  // El precio de venta YA incluye IVA — hacemos back-calculation
  const precioConIva   = precioLista - descuentoMonto;          // precio que paga el cliente (con IVA)
  const divisor        = 1 + ivaPorcentaje / 100;               // 1.13 para IVA 13%
  const precioFinal    = Math.round(precioConIva / divisor);    // base imponible (sin IVA) → va a BD
  const ivaMonto       = precioConIva - precioFinal;            // IVA desglosado
  const totalConIva    = precioConIva;                          // total = lo que ingresó el usuario

  // Vista en dólares: valor FIJO en USD (IVA incluido). Neto = lista − descuento.
  const netUsd         = Math.max(0, (Number(precioUsd) || 0) - (Number(descuentoUsd) || 0));
  const precioUsdTotal = netUsd;
  const hayUsd         = (Number(precioUsd) || 0) > 0;
  const baseUsd        = hayUsd ? precioUsdTotal / divisor : 0;
  const ivaUsd         = precioUsdTotal - baseUsd;
  // Formatea un valor mostrando ₡ o $ según la moneda elegida en el resumen.
  const fmtMon = (crc: number, usd: number) => (verEnUsd ? fmtUSD(usd) : fmtCRC(crc));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !cliente.nombre_completo || !cliente.cedula) {
      toast.error("Por favor, completa todos los campos requeridos.");
      return;
    }
    if (precioFinal <= 0) {
      toast.error("El precio final debe ser mayor a cero.");
      return;
    }
    try {
      await apiClient.post("/quotes", {
        cliente,
        vehiculoId: vehicle.id,
        precio_lista: precioLista,
        descuento_monto: descuentoMonto,
        precio_final: precioFinal,
        // Venta en USD: se manda el valor NETO en dólares (lista − descuento); el backend congela CRC y TC.
        precio_venta_usd: monedaVenta === "USD" && netUsd > 0 ? netUsd : undefined,
        iva_porcentaje: ivaPorcentaje,
        // fecha_expiracion omitida → backend calcula automáticamente hoy + 4 días
        gasto_marchamo: gastoMarchamo,
        gasto_inscripcion: gastoInscripcion,
        gasto_placas: gastoPlacas,
        gasto_otros: gastoOtros,
        gasto_otros_descripcion: gastoOtrosDesc,
        tipo_combustible: tipoCombustible,
        regalias,
        notas_cliente: notasCliente,
        leadId: leadId ? Number(leadId) : undefined,
        fuente_lead: !leadId ? fuenteLead : undefined,
      });
      toast.success("¡Cotización creada con éxito!");
      navigate(`${basePath}/quotes`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al crear la cotización.");
    }
  };

  if (loading) return <PageLoader message="Cargando vehículo..." />;
  if (!vehicle) return <PageLoader message="Vehículo no encontrado." />;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Cotización — {vehicle.marca} {vehicle.modelo} ({vehicle.año})</h1>
      {/* Badge lead existente */}
      {leadId ? (
        <div className={styles.leadBadge}>
          🔗 Cotización para <strong>{leadNombre || `Lead #${leadId}`}</strong> — los datos del cliente se pre-llenaron automáticamente. Completá la cédula/pasaporte para continuar.
        </div>
      ) : (
        /* Sin lead previo → selector de fuente para crear uno automático */
        <div className={styles.fuenteCard}>
          <div className={styles.fuenteTitle}>
            📞 ¿Cómo llegó el cliente?
          </div>
          <p className={styles.fuenteHint}>
            Se creará un Lead automáticamente vinculado a esta cotización.
          </p>
          <div className={styles.fuenteGrid}>
            {[
              { value: "Presencial",  icon: "🏠", label: "Presencial" },
              { value: "Llamada",     icon: "📞", label: "Llamada" },
              { value: "WhatsApp",    icon: "💬", label: "WhatsApp" },
              { value: "Instagram",   icon: "📸", label: "Instagram" },
              { value: "Facebook",    icon: "👥", label: "Facebook" },
              { value: "TikTok",      icon: "🎵", label: "TikTok" },
              { value: "Referido",    icon: "🤝", label: "Referido" },
              { value: "Web",         icon: "🌐", label: "Sitio Web" },
              { value: "Otro",        icon: "📌", label: "Otro" },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                className={`${styles.fuenteBtn} ${fuenteLead === f.value ? styles.fuenteBtnActive : ""}`}
                onClick={() => setFuenteLead(f.value)}
              >
                <span className={styles.fuenteBtnIcon}>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Datos del cliente */}
      <Card title="Datos del Cliente">
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Nombre Completo *</label>
            <input name="nombre_completo" value={cliente.nombre_completo}
              onChange={(e) => setCliente(p => ({ ...p, nombre_completo: e.target.value }))} required />
          </div>
          <div className={styles.field}>
            <label>Cédula / Pasaporte *</label>
            <input name="cedula" value={cliente.cedula}
              onChange={(e) => setCliente(p => ({ ...p, cedula: e.target.value }))} required />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input name="email" type="email" value={cliente.email}
              onChange={(e) => setCliente(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Teléfono</label>
            <input name="telefono" type="tel" value={cliente.telefono}
              onChange={(e) => setCliente(p => ({ ...p, telefono: e.target.value }))} />
          </div>
        </div>
      </Card>

      {/* Precio del vehículo */}
      <Card title="Precio del Vehículo e IVA">
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Moneda de la venta</label>
            <select value={monedaVenta} onChange={(e) => setMonedaVenta(e.target.value as "CRC" | "USD")}>
              <option value="CRC">₡ Colones</option>
              <option value="USD">$ Dólares (precio fijo)</option>
            </select>
            <span className={styles.fieldHint}>
              {monedaVenta === "USD"
                ? "El precio se fija en dólares; el CRC se congela al TC de hoy al guardar."
                : "Precio ingresado en colones."}
            </span>
          </div>

          {monedaVenta === "USD" ? (
            <>
              <div className={styles.field}>
                <label>Precio de Venta — incluye IVA ($)</label>
                <input type="number" min={0} value={precioUsd}
                  onChange={(e) => setPrecioUsd(Number(e.target.value))} />
                <span className={styles.fieldHint}>Valor fijo del vehículo en dólares (no cambia con el TC)</span>
              </div>
              <div className={styles.field}>
                <label>Precio con IVA (₡) — vista previa</label>
                <input type="text" value={fmtCRC(precioLista)} readOnly />
                <span className={styles.fieldHint}>
                  {tcVigente > 0
                    ? `Al TC ₡${tcVigente.toLocaleString("es-CR")}/USD · se congela al guardar`
                    : "⚠️ Sin TC del día — cargalo en Multimoneda para congelar el precio"}
                </span>
              </div>
            </>
          ) : (
            <div className={styles.field}>
              <label>Precio de Venta — incluye IVA (₡)</label>
              <input type="number" value={precioLista}
                onChange={(e) => setPrecioLista(Number(e.target.value))} />
              <span className={styles.fieldHint}>Precio final al cliente con IVA incluido</span>
            </div>
          )}
          {monedaVenta === "USD" ? (
            <div className={styles.field}>
              <label>Descuento ($)</label>
              <input type="number" min={0} value={descuentoUsd}
                onChange={(e) => setDescuentoUsd(Number(e.target.value))} />
              <span className={styles.fieldHint}>
                {tcVigente > 0 ? `≈ ${fmtCRC(descuentoMonto)} al TC de hoy` : "Descuento en dólares"}
              </span>
            </div>
          ) : (
            <div className={styles.field}>
              <label>Descuento (₡)</label>
              <input type="number" min={0} value={descuentoMonto}
                onChange={(e) => setDescuentoMonto(Number(e.target.value))} />
            </div>
          )}
          <div className={`${styles.field} ${styles.highlight}`}>
            <label>Base Imponible (sin IVA) — calculada</label>
            <input type="text" value={fmtCRC(precioFinal)} readOnly />
            <span className={styles.fieldHint}>Se calcula automáticamente: Precio ÷ {(1 + ivaPorcentaje/100).toFixed(2)}</span>
          </div>
          <div className={styles.field}>
            <label>Tipo de Combustible</label>
            <select value={tipoCombustible} onChange={(e) => setTipoCombustible(e.target.value)}>
              <option value="Electrico">Eléctrico</option>
              <option value="Hibrido">Híbrido</option>
              <option value="Hibrido Enchufable">Híbrido Enchufable (PHEV)</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Diesel">Diésel</option>
              <option value="Gas">Gas</option>
            </select>
            <span className={styles.fieldHint}>Requerido por entidades financieras</span>
          </div>
          <div className={styles.field}>
            <label>
              IVA (%)
              {rolActual === "Vendedor" && <span className={styles.lockBadge}>🔒 Solo Admin</span>}
            </label>
            <select
              value={ivaPorcentaje}
              onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
              disabled={rolActual === "Vendedor"}
              title={rolActual === "Vendedor" ? "Solo los Administradores pueden cambiar el porcentaje de IVA" : ""}
            >
              <option value={13}>13% — General (vehículos)</option>
              <option value={4}>4% — Reducido</option>
              <option value={2}>2% — Canasta básica</option>
              <option value={1}>1% — Especial</option>
              <option value={0}>0% — Exento</option>
            </select>
            <span className={styles.fieldHint}>
              {rolActual === "Vendedor"
                ? "El IVA está configurado al " + ivaPorcentaje + "% — contacta a un administrador para cambiarlo"
                : "Ley del IVA, Costa Rica"}
            </span>
          </div>
          <div className={`${styles.field} ${styles.ivaField}`}>
            <label>IVA ({ivaPorcentaje}%)</label>
            <input type="text" value={fmtCRC(ivaMonto)} readOnly />
          </div>
          <div className={`${styles.field} ${styles.totalIvaField}`}>
            <label>💰 Total al cliente con IVA</label>
            <input type="text" value={fmtCRC(totalConIva)} readOnly />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <div className={styles.reservaBanner}>
              🔒 Al crear esta cotización el vehículo quedará <strong>reservado automáticamente por 4 días</strong>.
              Si no se concreta, se liberará solo. Un administrador puede extender el plazo.
            </div>
          </div>
        </div>
      </Card>

      {/* Gastos de inscripción */}
      <Card title="Gastos de Inscripción (desglosados en la proforma)">
        <p className={styles.hint}>
          Estos gastos se detallan en la factura proforma. El precio del vehículo <strong>no incluye</strong> estos costos.
        </p>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Marchamo (primer año) ₡</label>
            <input type="number" min={0} value={gastoMarchamo}
              onChange={(e) => setGastoMarchamo(Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label>Inscripción / Derechos de Registro ₡</label>
            <input type="number" min={0} value={gastoInscripcion}
              onChange={(e) => setGastoInscripcion(Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label>Placas / Derechos de Circulación ₡</label>
            <input type="number" min={0} value={gastoPlacas}
              onChange={(e) => setGastoPlacas(Number(e.target.value))} />
          </div>
          <div className={styles.field}>
            <label>Otros Gastos ₡</label>
            <input type="number" min={0} value={gastoOtros}
              onChange={(e) => setGastoOtros(Number(e.target.value))} />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Descripción de Otros Gastos</label>
            <input type="text" placeholder="Ej: Transporte, seguro de entrega..."
              value={gastoOtrosDesc} onChange={(e) => setGastoOtrosDesc(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Regalías y extras */}
      <Card title="Regalías e Información Adicional">
        <div className={styles.formGrid}>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Regalías / Obsequios incluidos</label>
            <textarea rows={2}
              placeholder="Ej: Cargador portátil, garantía extendida 2 años, primer servicio gratis..."
              value={regalias} onChange={(e) => setRegalias(e.target.value)} />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Notas para el cliente</label>
            <textarea rows={2}
              placeholder="Ej: Entrega estimada en 15 días hábiles. Condiciones sujetas a disponibilidad."
              value={notasCliente} onChange={(e) => setNotasCliente(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Resumen */}
      <div className={styles.summary}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>Resumen de la Proforma (vista cliente)</h3>
          {hayUsd && (
            <button type="button" onClick={() => setVerEnUsd(v => !v)}
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
              {verEnUsd ? "💱 Ver en colones (₡)" : "💵 Ver en dólares ($)"}
            </button>
          )}
        </div>
        {descuentoMonto > 0 && (
          <>
            <div className={styles.summaryRow}>
              <span>Precio de lista:</span>
              <span>{fmtMon(precioLista, Number(precioUsd) || 0)}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.discount}`}>
              <span>Descuento:</span>
              <span>− {fmtMon(descuentoMonto, Number(descuentoUsd) || 0)}</span>
            </div>
          </>
        )}

        <div className={styles.summaryRow}>
          <span>Precio con IVA ingresado:</span>
          <span>{fmtMon(precioLista, Number(precioUsd) || 0)}</span>
        </div>
        {descuentoMonto > 0 && (
          <div className={`${styles.summaryRow} ${styles.discountRow}`}>
            <span>Descuento:</span>
            <span>− {fmtMon(descuentoMonto, Number(descuentoUsd) || 0)}</span>
          </div>
        )}
        <div className={`${styles.summaryRow} ${styles.subtotalRow}`}>
          <span>Base imponible (sin IVA {ivaPorcentaje}%):</span>
          <span>{fmtMon(precioFinal, baseUsd)}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.ivaRow}`}>
          <span>IVA ({ivaPorcentaje}%) desglosado:</span>
          <span>{fmtMon(ivaMonto, ivaUsd)}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.total}`}>
          <span>💰 Total al cliente:</span>
          <span>{fmtMon(totalConIva, precioUsdTotal)}</span>
        </div>
        <p className={styles.summaryNote}>
          {verEnUsd
            ? "💵 Valor fijo del vehículo en dólares (IVA incluido). El botón lo vuelve a colones."
            : "✅ El precio ingresado ya incluye IVA — el sistema lo desglosa automáticamente"}
        </p>
      </div>

      <button type="submit" className="btn btn-principal"
        style={{ width: "100%", padding: "1rem", marginTop: "1rem" }}>
        Generar Cotización / Proforma
      </button>
    </form>
  );
};
