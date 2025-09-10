import { useState } from "react";
import apiClient from "@/api/apiClient";
import { Card } from "@/components/Card";
import toast from "react-hot-toast";
import styles from "./ReportsPage.module.css";
import * as XLSX from "xlsx";

type ReportType =
  | "profit"
  | "sales-by-seller"
  | "sales-by-vehicle"
  | "detailed-sales"
  | "inventory";

const reportOptions = [
  { value: "profit", label: "Informe de Ganancias" },
  { value: "sales-by-seller", label: "Ventas por Vendedor" },
  { value: "sales-by-vehicle", label: "Ventas por Vehículo" },
  { value: "detailed-sales", label: "Listado General de Ventas" },
  { value: "inventory", label: "Inventario Actual" },
];

export const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>("profit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReportType(e.target.value as ReportType);
    setReportData(null);
  };
  const handleGenerateReport = async () => {
    if (reportType !== "inventory" && (!startDate || !endDate)) {
      toast.error("Por favor, selecciona un rango de fechas.");
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      const response = await apiClient.get("/reports/summary", {
        params: { type: reportType, startDate, endDate },
      });
      setReportData(response.data);
    } catch (error) {
      toast.error("Error al generar el informe.");
    } finally {
      setLoading(false);
    }
  };
  const handleExportToExcel = () => {
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      toast.error("No hay datos para exportar.");
      return;
    }
    let dataToExport: any[] = [];
    let fileName = `Informe_${reportType}_${new Date().toLocaleDateString()}.xlsx`;

    if (reportType === "profit") {
      dataToExport = [
        {
          "Total Ventas": reportData.totalVentas,
          "Costo de Ventas": reportData.totalCosto,
          "Ganancia Bruta": reportData.gananciaBruta,
        },
      ];
    } else if (reportType === "inventory") {
      dataToExport = reportData.vehicles.map((v: any) => ({
        ID: v.id,
        Marca: v.marca,
        Modelo: v.modelo,
        Año: v.año,
        VIN: v.vin,
        "Precio Costo": v.precio_costo,
      }));
    } else {
      dataToExport = reportData;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informe");
    XLSX.writeFile(workbook, fileName);
  };

  const renderReport = () => {
    if (loading) {
      return <p>Cargando datos...</p>;
    }
    if (!reportData) {
      return <p>No hay datos para mostrar. Por favor, genera un informe.</p>;
    }
    if (Array.isArray(reportData) && reportData.length === 0) {
      return (
        <p>No se encontraron resultados para los filtros seleccionados.</p>
      );
    }

    switch (reportType) {
      case "profit":
        const {
          totalVentas = 0,
          totalCosto = 0,
          gananciaBruta = 0,
        } = reportData || {};
        return (
          <div className={styles.kpiGrid}>
            <Card title="Total Ventas">
              <h2>₡{totalVentas.toLocaleString("es-CR")}</h2>
            </Card>
            <Card title="Costo Inventario Vendido">
              <h2>₡{totalCosto.toLocaleString("es-CR")}</h2>
            </Card>
            <Card title="Ganancia Bruta">
              <h2>₡{gananciaBruta.toLocaleString("es-CR")}</h2>
            </Card>
          </div>
        );

      case "sales-by-seller":
        if (!Array.isArray(reportData)) return null;
        return (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Unidades Vendidas</th>
                <th>Total Vendido</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row: any, index: number) => (
                <tr key={index}>
                  <td>{row.vendedor}</td>
                  <td>{row.unidadesvendidas}</td>
                  <td>₡{Number(row.totalvendido).toLocaleString("es-CR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "sales-by-vehicle":
        if (!Array.isArray(reportData)) return null;
        return (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Unidades Vendidas</th>
                <th>Total Vendido</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row: any, index: number) => (
                <tr key={index}>
                  <td>{row.vehiculo}</td>
                  <td>{row.unidadesvendidas}</td>
                  <td>₡{Number(row.totalvendido).toLocaleString("es-CR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "detailed-sales":
        if (!Array.isArray(reportData)) return null;
        return (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Vendedor</th>
                <th>Monto Final</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((venta: any) => (
                <tr key={venta.id}>
                  <td>{venta.id}</td>
                  <td>{new Date(venta.fecha_venta).toLocaleDateString()}</td>
                  <td>{venta.cotizacion.cliente.nombre_completo}</td>
                  <td>{`${venta.cotizacion.vehiculo.marca} ${venta.cotizacion.vehiculo.modelo}`}</td>
                  <td>{venta.vendedor.nombre_completo}</td>
                  <td>₡{Number(venta.monto_final).toLocaleString("es-CR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "inventory":
        if (
          typeof reportData !== "object" ||
          !Array.isArray(reportData.vehicles)
        )
          return null;
        return (
          <>
            <p>
              <strong>Total de vehículos en stock:</strong>{" "}
              {reportData.totalVehicles}
            </p>
            <p>
              <strong>Costo total del inventario:</strong> ₡
              {Number(reportData.inventoryCost).toLocaleString("es-CR")}
            </p>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Año</th>
                  <th>VIN</th>
                  <th>Precio Costo</th>
                </tr>
              </thead>
              <tbody>
                {reportData.vehicles.map((v: any) => (
                  <tr key={v.id}>
                    <td>{v.id}</td>
                    <td>{v.marca}</td>
                    <td>{v.modelo}</td>
                    <td>{v.año}</td>
                    <td>{v.vin}</td>
                    <td>₡{Number(v.precio_costo).toLocaleString("es-CR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      default:
        return <p>Selecciona un tipo de informe válido.</p>;
    }
  };

  return (
    <>
      <Card title="Generador de Informes">
        <div className={styles.filters}>
          <select value={reportType} onChange={handleReportTypeChange}>
            {reportOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {reportType !== "inventory" && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}
          <button
            className="btn btn-principal"
            onClick={handleGenerateReport}
            disabled={loading}
          >
            {loading ? "Generando..." : "Generar Informe"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportToExcel}
            disabled={!reportData}
          >
            Exportar a Excel
          </button>
        </div>
      </Card>
      <Card title="Resultados del Informe">{renderReport()}</Card>
    </>
  );
};
