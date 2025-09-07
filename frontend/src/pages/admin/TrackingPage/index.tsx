import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { Card } from "../../../components/Card";
import styles from "./TrackingPage.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../../img/Logos/Logo-Conejo-Motors.png";

// Reutilizamos la interfaz de Vehicle que ya definimos
interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  año: number;
  vin: string;
  bodega?: { id: number; nombre: string };
}

// Interfaz para agrupar los vehículos
interface GroupedVehicles {
  [bodegaNombre: string]: Vehicle[];
}

export const TrackingPage = () => {
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicles>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAndGroupVehicles = async () => {
      try {
        const response = await apiClient.get("/vehicles");
        const vehicles: Vehicle[] = response.data;

        // Agrupamos los vehículos por el nombre de la bodega
        const groups = vehicles.reduce((acc, vehicle) => {
          const key = vehicle.bodega?.nombre || "Sin Asignar";
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(vehicle);
          return acc;
        }, {} as GroupedVehicles);

        setGroupedVehicles(groups);
      } catch (err) {
        setError("No se pudo cargar la información de los vehículos.");
      }
    };

    fetchAndGroupVehicles();
  }, []);

  const handleGeneratePdf = (bodegaNombre: string, vehicles: Vehicle[]) => {
    const doc = new jsPDF();
    const hoy = new Date();

    // 1. Encabezado del Documento
    doc.addImage(logo, "PNG", 14, 15, 40, 15); // Logo de la empresa
    doc.setFontSize(22);
    doc.text("Reporte de Inventario y Traslado", 200, 25, { align: "right" });

    // 2. Información General
    doc.setFontSize(12);
    doc.text(`Ubicación de Destino: ${bodegaNombre}`, 14, 40);
    doc.text(`Fecha de Emisión: ${hoy.toLocaleDateString("es-CR")}`, 14, 47);
    doc.text(`Total de Vehículos: ${vehicles.length}`, 200, 40, {
      align: "right",
    });

    // 3. Tabla con la lista de vehículos
    autoTable(doc, {
      startY: 55,
      head: [["Marca", "Modelo", "Año", "VIN (N.º de Serie)"]],
      body: vehicles.map((v) => [v.marca, v.modelo, v.año, v.vin]),
      theme: "grid", // Un tema limpio para documentos formales
      headStyles: {
        fillColor: "#024f7d", // Color azul principal
        textColor: "#ffffff",
      },
    });

    // 4. Sección de Firmas al final del documento
    const finalY = (doc as any).lastAutoTable.finalY || 150; // Obtenemos la posición final de la tabla
    doc.setFontSize(11);
    doc.text("Firmas de Recepción y Entrega:", 14, finalY + 20);

    doc.text("_________________________", 14, finalY + 40);
    doc.text("Entregado por (Nombre y Firma)", 14, finalY + 45);

    doc.text("_________________________", 120, finalY + 40);
    doc.text("Recibido por (Nombre y Firma)", 120, finalY + 45);

    // 5. Guardar el PDF
    doc.save(
      `Reporte_Traslado_${bodegaNombre.replace(
        /\s/g,
        "_"
      )}_${hoy.toLocaleDateString("es-CR")}.pdf`
    );
  };

  return (
    <>
      <h1>Rastreo de Inventario por Ubicación</h1>
      {error && <p className={styles.error}>{error}</p>}

      {Object.entries(groupedVehicles).map(([bodegaNombre, vehicles]) => (
        <Card
          key={bodegaNombre}
          title={`Ubicación: ${bodegaNombre} (${vehicles.length} vehículos)`}
        >
          <div className={styles.bodegaHeader}>
            <button
              className="btn btn-secondary"
              onClick={() => handleGeneratePdf(bodegaNombre, vehicles)}
            >
              Imprimir Reporte de Traslado
            </button>
          </div>
          <table className={styles.trackingTable}>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>VIN</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.marca}</td>
                  <td>{vehicle.modelo}</td>
                  <td>{vehicle.año}</td>
                  <td>{vehicle.vin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </>
  );
};
