import * as XLSX from "xlsx";

/**
 * Exporta un arreglo de objetos a un archivo .xlsx descargable.
 * @param rows  Filas (cada objeto = una fila; las llaves son los encabezados)
 * @param filename  Nombre base del archivo (sin extensión)
 * @param sheetName  Nombre de la hoja
 */
export function exportToExcel(
  rows: Record<string, any>[],
  filename: string,
  sheetName = "Datos",
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${fecha}.xlsx`);
}
