import { useState, useEffect } from "react";
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
}

const fmtCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

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

  // IVA
  const [ivaPorcentaje, setIvaPorcentaje] = useState(13);

  // Tipo de combustible (requerido por bancos para financiamiento)
  const [tipoCombustible, setTipoCombustible] = useState("Electrico");

  useEffect(() => {
    if (!vehicleId) return;
    apiClient.get(`/vehicles/${vehicleId}`)
      .then((res) => {
        const v = res.data;
        setVehicle(v);
        const lista = Number(v.precio_venta_final ?? v.precio_venta);
        setPrecioLista(lista);
        if (v.marchamo) setGastoMarchamo(Number(v.marchamo));
        if (v.inscripcion_traspaso) setGastoInscripcion(Number(v.inscripcion_traspaso));
      })
      .catch(() => toast.error("No se pudieron cargar los detalles del vehículo."))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  // precio_final = base imponible (sin IVA)
  const precioFinal = precioLista - descuentoMonto;
  const totalGastos = gastoMarchamo + gastoInscripcion + gastoPlacas + gastoOtros;
  const precioBaseVehiculo = precioFinal - totalGastos;
  // IVA se aplica sobre el precio_final del vehículo
  const ivaMonto    = Math.round(precioFinal * ivaPorcentaje / 100);
  const totalConIva = precioFinal + ivaMonto;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !cliente.nombre_completo || !cliente.cedula || !fechaExpiracion) {
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
        iva_porcentaje: ivaPorcentaje,
        fecha_expiracion: fechaExpiracion,
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
          🔗 Cotización vinculada al Lead #{leadId} — el lead se actualizará automáticamente.
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
            <label>Precio de Lista — Base Imponible (₡)</label>
            <input type="number" value={precioLista}
              onChange={(e) => setPrecioLista(Number(e.target.value))} />
            <span className={styles.fieldHint}>Precio sin IVA</span>
          </div>
          <div className={styles.field}>
            <label>Descuento (₡)</label>
            <input type="number" min={0} value={descuentoMonto}
              onChange={(e) => setDescuentoMonto(Number(e.target.value))} />
          </div>
          <div className={`${styles.field} ${styles.highlight}`}>
            <label>Subtotal sin IVA</label>
            <input type="text" value={fmtCRC(precioFinal)} readOnly />
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
            <label>IVA (%)</label>
            <select value={ivaPorcentaje} onChange={(e) => setIvaPorcentaje(Number(e.target.value))}>
              <option value={13}>13% — General (vehículos)</option>
              <option value={4}>4% — Reducido</option>
              <option value={2}>2% — Canasta básica</option>
              <option value={1}>1% — Especial</option>
              <option value={0}>0% — Exento</option>
            </select>
            <span className={styles.fieldHint}>Ley del IVA, Costa Rica</span>
          </div>
          <div className={`${styles.field} ${styles.ivaField}`}>
            <label>IVA ({ivaPorcentaje}%)</label>
            <input type="text" value={fmtCRC(ivaMonto)} readOnly />
          </div>
          <div className={`${styles.field} ${styles.totalIvaField}`}>
            <label>💰 Total al cliente con IVA</label>
            <input type="text" value={fmtCRC(totalConIva)} readOnly />
          </div>
          <div className={styles.field}>
            <label>Válida Hasta *</label>
            <input type="date" value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)} required />
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
        <h3>Resumen de la Proforma (vista cliente)</h3>
        {descuentoMonto > 0 && (
          <>
            <div className={styles.summaryRow}>
              <span>Precio de lista:</span>
              <span>{fmtCRC(precioLista)}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.discount}`}>
              <span>Descuento:</span>
              <span>− {fmtCRC(descuentoMonto)}</span>
            </div>
          </>
        )}

        {/* El precio del vehículo que ve el cliente = precioFinal − gastos desglosados */}
        {totalGastos > 0 && (
          <div className={styles.summaryRow}>
            <span>Precio del vehículo:</span>
            <span>{fmtCRC(precioBaseVehiculo > 0 ? precioBaseVehiculo : precioFinal)}</span>
          </div>
        )}
        {gastoMarchamo > 0 && (
          <div className={styles.summaryRow}><span>+ Marchamo:</span><span>{fmtCRC(gastoMarchamo)}</span></div>
        )}
        {gastoInscripcion > 0 && (
          <div className={styles.summaryRow}><span>+ Inscripción:</span><span>{fmtCRC(gastoInscripcion)}</span></div>
        )}
        {gastoPlacas > 0 && (
          <div className={styles.summaryRow}><span>+ Placas:</span><span>{fmtCRC(gastoPlacas)}</span></div>
        )}
        {gastoOtros > 0 && (
          <div className={styles.summaryRow}>
            <span>+ {gastoOtrosDesc || "Otros gastos"}:</span>
            <span>{fmtCRC(gastoOtros)}</span>
          </div>
        )}

        <div className={`${styles.summaryRow} ${styles.subtotalRow}`}>
          <span>Subtotal (sin IVA):</span>
          <span>{fmtCRC(precioFinal)}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.ivaRow}`}>
          <span>IVA ({ivaPorcentaje}%):</span>
          <span>+ {fmtCRC(ivaMonto)}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.total}`}>
          <span>💰 Total con IVA:</span>
          <span>{fmtCRC(totalConIva)}</span>
        </div>
        <p className={styles.summaryNote}>
          ℹ️ Precio base imponible: {fmtCRC(precioFinal)} · IVA {ivaPorcentaje}%: {fmtCRC(ivaMonto)}
        </p>
      </div>

      <button type="submit" className="btn btn-principal"
        style={{ width: "100%", padding: "1rem", marginTop: "1rem" }}>
        Generar Cotización / Proforma
      </button>
    </form>
  );
};
