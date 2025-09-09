import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/img/Logos/Logo-Conejo-Motors.png";
import styles from "./QuoteDetailsPage.module.css";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(value);
};

interface QuoteDetails {
  id: number;
  estado: string;
  precio_final: number;
  fecha_creacion: string;
  fecha_expiracion: string;
  cliente: { nombre_completo: string; cedula: string };
  vehiculo: {
    id: number;
    marca: string;
    modelo: string;
    año: number;
    estado: string;
  };
  vendedor?: { nombre_completo: string }; // <-- Hacemos al vendedor opcional
}

export const QuoteDetailsPage = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteDetails | null>(null);

  useEffect(() => {
    apiClient
      .get(`/quotes/${quoteId}`)
      .then((response) => setQuote(response.data))
      .catch(() => toast.error("No se pudo cargar la cotización."));
  }, [quoteId]);

  const handleRegisterSale = async () => {
    if (!quote) return;
    try {
      await apiClient.post("/sales", {
        cotizacionId: quote.id,
        metodo_pago: "Pendiente",
      });
      toast.success("¡Venta registrada con éxito!");
      navigate(-1);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Error al registrar la venta."
      );
    }
  };

  const handleDownloadPDF = () => {
    if (!quote) return;
    const doc = new jsPDF();
    const { cliente, vehiculo, precio_final, fecha_expiracion, id, vendedor } =
      quote;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width; // Obtenemos el ancho de la página
    const margin = 14; // Margen izquierdo/derecho
    const textWidth = pageWidth - 2 * margin; // Ancho disponible para el texto

    const nombreVendedor = vendedor?.nombre_completo || "Equipo de Ventas";

    // --- ENCABEZADO ---
    doc.addImage(logo, "PNG", margin, 10, 30, 30);
    doc.setFontSize(22);
    doc.text("Cotización", pageWidth - margin, 25, { align: "right" });
    doc.setFontSize(12);
    doc.text(`N°: ${id}`, pageWidth - margin, 32, { align: "right" });

    // --- 👇 CAMBIO AQUÍ: TEXTO DE INTRODUCCIÓN ESTÁNDAR CON AJUSTE 👇 ---
    doc.setFontSize(11);
    const introTextRaw = `Estimado(a) ${cliente.nombre_completo},\n\nEs un placer para nosotros en Conejo Motors presentarle la siguiente cotización para el vehículo de su interés. Estamos comprometidos con ofrecerle la mejor tecnología en movilidad eléctrica.`;

    // Divide el texto para que quepa en el ancho disponible
    const splitIntroText = doc.splitTextToSize(introTextRaw, textWidth);

    let currentY = 50; // Posición inicial para el texto de introducción
    doc.text(splitIntroText, margin, currentY);

    currentY += splitIntroText.length * 7; // Ajusta Y para la siguiente sección (7 es un estimado del alto de línea)
    // --- FIN DEL CAMBIO EN INTRODUCCIÓN ---

    // --- TABLAS DE DATOS ---
    autoTable(doc, {
      startY: currentY + 5, // Usamos la Y actualizada
      head: [["Datos del Cliente", "Datos del Vehículo"]],
      body: [
        [
          `Nombre: ${cliente.nombre_completo}\nCédula: ${cliente.cedula}`,
          `Marca: ${vehiculo.marca}\nModelo: ${vehiculo.modelo}\nAño: ${vehiculo.año}`,
        ],
      ],
      theme: "striped",
    });

    let finalY = (doc as any).lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY + 10,
      head: [["Descripción", "Precio"]],
      body: [
        [
          `Vehículo Eléctrico ${vehiculo.marca} ${vehiculo.modelo}`,
          formatCurrency(precio_final),
        ],
      ],
      foot: [["Monto Final", formatCurrency(precio_final)]],
      theme: "striped",
      headStyles: { fillColor: "#024f7d" },
      footStyles: { fontStyle: "bold" },
    });

    // --- TEXTO DE DESPEDIDA Y VENDEDOR ---
    finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(
      `Esta cotización es válida hasta el: ${new Date(
        fecha_expiracion
      ).toLocaleDateString()}.`,
      margin,
      finalY + 10
    );
    doc.text("Precios incluyen impuestos de venta.", margin, finalY + 15);

    const closingTextRaw = `Agradecemos su interés y quedamos a su disposición para cualquier consulta.\n\nAtentamente,`;
    const splitClosingText = doc.splitTextToSize(closingTextRaw, textWidth); // También ajustamos el texto de despedida

    doc.text(splitClosingText, margin, pageHeight - 60);

    doc.text("_________________________", margin, pageHeight - 40);
    doc.text(nombreVendedor, margin, pageHeight - 35);
    doc.text("Asesor de Ventas, Conejo Motors", margin, pageHeight - 30);

    doc.save(
      `Cotizacion_${id}_${cliente.nombre_completo.replace(/\s/g, "_")}.pdf`
    );
  };

  if (!quote) return <p>Cargando detalles de la cotización...</p>;

  // ... (El JSX del return se mantiene igual)
  return (
    <div className={styles.detailsContainer}>
      <div className={styles.header}>
        <h1>Detalles de la Cotización #{quote.id}</h1>
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={handleDownloadPDF}>
            Descargar PDF
          </button>
          {quote.vehiculo.estado === "Disponible" && (
            <button className="btn btn-principal" onClick={handleRegisterSale}>
              Registrar Venta
            </button>
          )}
        </div>
      </div>
      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <h4>Cliente</h4>
          <p>{quote.cliente.nombre_completo}</p>
          <span>Cédula: {quote.cliente.cedula}</span>
        </div>
        <div className={styles.detailCard}>
          <h4>Vehículo</h4>
          <p>
            {quote.vehiculo.marca} {quote.vehiculo.modelo} ({quote.vehiculo.año}
            )
          </p>
          <span>Estado: {quote.vehiculo.estado}</span>
        </div>
        <div className={styles.detailCard}>
          <h4>Términos</h4>
          <p>{formatCurrency(quote.precio_final)}</p>
          <span>
            Válida hasta:{" "}
            {new Date(quote.fecha_expiracion).toLocaleDateString()}
          </span>
        </div>
      </div>
      {quote.vehiculo.estado !== "Disponible" && (
        <p className={styles.warning}>
          Este vehículo ya no está disponible para la venta.
        </p>
      )}
    </div>
  );
};
