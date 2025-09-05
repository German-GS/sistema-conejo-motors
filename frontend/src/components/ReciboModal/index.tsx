// En: src/components/ReciboModal/index.tsx

import React from "react";
import styles from "./ReciboModal.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../img/Logos/Logo-Conejo-Motors.png";

interface ReciboModalProps {
  recibo: any;
  onClose: () => void;
}

// Helper para formatear a moneda local (Colón costarricense)
const formatCurrency = (value: number) => {
  return `₡${(value || 0).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const ReciboModal: React.FC<ReciboModalProps> = ({
  recibo,
  onClose,
}) => {
  if (!recibo) return null;

  // --- 👇 LEEMOS Y CONVERTIMOS TODOS LOS VALORES A NÚMERO USANDO parseFloat 👇 ---
  const nombreColaborador = recibo.usuario?.nombre_completo || "N/A";

  // INGRESOS
  const salarioBase = parseFloat(recibo.salario_base_periodo) || 0;
  const comisiones = parseFloat(recibo.comisiones_ganadas) || 0;
  const horasExtra = parseFloat(recibo.horas_extra) || 0;
  const salarioBruto = parseFloat(recibo.salario_bruto) || 0;

  // DEDUCCIONES
  const sem = parseFloat(recibo.deduccion_sem) || 0;
  const ivm = parseFloat(recibo.deduccion_ivm) || 0;
  const bancoPopular = parseFloat(recibo.deduccion_banco_popular) || 0;
  const renta = parseFloat(recibo.deduccion_renta) || 0;
  const otrasDeducciones = parseFloat(recibo.otras_deducciones) || 0;

  // TOTALES
  const totalDeducciones = sem + ivm + bancoPopular + renta + otrasDeducciones;
  const salarioNeto = parseFloat(recibo.salario_neto) || 0;
  // -------------------------------------------------------------------------

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Dibuja la primera tabla (Ingresos)
    autoTable(doc, {
      didDrawPage: (data) => {
        doc.addImage(logo, "PNG", 14, 10, 25, 25);
        doc.setFontSize(20);
        doc.text("Recibo de Pago", 105, 25, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Colaborador: ${nombreColaborador}`, 14, 50);
        // Formateamos las fechas de inicio y fin del periodo
        const inicioStr = recibo.periodo_inicio.substring(0, 10);
        const finStr = recibo.periodo_fin.substring(0, 10);

        // Función para cambiar el formato de "YYYY-MM-DD" a "DD/MM/YYYY"
        const formatStringDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split("-");
          return `${day}/${month}/${year}`;
        };

        const fechaInicio = formatStringDate(inicioStr);
        const fechaFin = formatStringDate(finStr);

        doc.text(`Periodo de Pago: ${fechaInicio} al ${fechaFin}`, 14, 57);
      },
      startY: 65,
      head: [["Ingresos", "Monto"]],
      body: [
        ["Salario Base del Periodo", `+ ${formatCurrency(salarioBase)}`],
        ["Comisiones Ganadas", `+ ${formatCurrency(comisiones)}`],
        ["Horas Extra", `+ ${formatCurrency(horasExtra)}`],
      ],
      foot: [["Salario Bruto Total", formatCurrency(salarioBruto)]],
      theme: "striped",
      headStyles: { fillColor: "#024f7d" },
      footStyles: {
        fillColor: "#e0e0e0",
        textColor: "#333",
        fontStyle: "bold",
      },
      margin: { top: 60 },
    });

    // --- 👇 AQUÍ ESTÁ LA CORRECCIÓN 👇 ---
    // Verificamos de forma segura la posición de la última tabla
    const lastTable = (doc as any).lastAutoTable;
    const firstTableEndY = lastTable ? lastTable.finalY : 120; // Usamos 120 como respaldo

    // Dibuja la segunda tabla (Deducciones)
    autoTable(doc, {
      startY: firstTableEndY + 10, // Inicia 10px debajo de la tabla anterior
      head: [["Deducciones", "Monto"]],
      body: [
        ["Seguro de Enfermedad y Maternidad (SEM)", `- ${formatCurrency(sem)}`],
        ["Invalidez, Vejez y Muerte (IVM)", `- ${formatCurrency(ivm)}`],
        ["Aporte Banco Popular", `- ${formatCurrency(bancoPopular)}`],
        ["Impuesto sobre la Renta", `- ${formatCurrency(renta)}`],
        ["Otras Deducciones", `- ${formatCurrency(otrasDeducciones)}`],
      ],
      foot: [["Total Deducciones", `- ${formatCurrency(totalDeducciones)}`]],
      theme: "striped",
      headStyles: { fillColor: "#c62828" },
      footStyles: {
        fillColor: "#e0e0e0",
        textColor: "#333",
        fontStyle: "bold",
      },
    });

    // Verificamos de nuevo para el texto final
    const secondLastTable = (doc as any).lastAutoTable;
    const secondTableEndY = secondLastTable ? secondLastTable.finalY : 200; // Usamos 200 como respaldo

    // Escribe el total final
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SALARIO NETO A RECIBIR:", 14, secondTableEndY + 15);
    doc.text(formatCurrency(salarioNeto), 184, secondTableEndY + 15, {
      align: "right",
    });
    // --- FIN DE LA CORRECCIÓN ---

    doc.save(`recibo_pago_${nombreColaborador.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2>Desglose del Recibo de {nombreColaborador}</h2>

        {/* --- 👇 SECCIÓN DE INGRESOS ACTUALIZADA 👇 --- */}
        <div className={styles.section}>
          <h4>Ingresos</h4>
          <p>
            <span>Salario Base del Periodo:</span> {formatCurrency(salarioBase)}
          </p>
          <p>
            <span>Comisiones Ganadas:</span> + {formatCurrency(comisiones)}
          </p>
          <p>
            <span>Horas Extra:</span> + {formatCurrency(horasExtra)}
          </p>
          <p className={styles.total}>
            <span>Salario Bruto:</span> {formatCurrency(salarioBruto)}
          </p>
        </div>

        {/* --- 👇 SECCIÓN DE DEDUCCIONES ACTUALIZADA 👇 --- */}
        <div className={styles.section}>
          <h4>Deducciones del Colaborador</h4>
          <p>
            <span>Seguro de Enfermedad y Maternidad (SEM):</span> -{" "}
            {formatCurrency(sem)}
          </p>
          <p>
            <span>Invalidez, Vejez y Muerte (IVM):</span> -{" "}
            {formatCurrency(ivm)}
          </p>
          <p>
            <span>Aporte al Banco Popular:</span> -{" "}
            {formatCurrency(bancoPopular)}
          </p>
          <p>
            <span>Impuesto sobre la Renta:</span> - {formatCurrency(renta)}
          </p>
          <p>
            <span>Otras Deducciones:</span> - {formatCurrency(otrasDeducciones)}
          </p>
          <p className={styles.total}>
            <span>Total Deducciones:</span> - {formatCurrency(totalDeducciones)}
          </p>
        </div>

        <div className={styles.summary}>
          <h3>
            Salario Neto a Recibir: <span>{formatCurrency(salarioNeto)}</span>
          </h3>
        </div>

        <div className={styles.actions}>
          <button className="btn btn-principal" onClick={handleDownloadPDF}>
            Descargar PDF
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
