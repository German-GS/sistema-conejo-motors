import { useState } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import styles from "./ImportVehiclesPage.module.css";
import { LuClipboardList, LuCircleCheck, LuPackage, LuTriangleAlert, LuFileText, LuFolderOpen, LuX } from "react-icons/lu";

interface PreviewRow {
  rowIndex: number;
  numero: number;
  cuenta_contable: string;
  marca: string;
  modelo: string;
  vin: string;
  año: number;
  color: string;
  incoterm: string;
  costo_factura_usd: number;
  tipo_cambio: number;
  costo_total_crc: number;
  marchamo: number;
  inscripcion_traspaso: number;
  estado: string;
  profileId?: number;
  error?: string;
}

interface Profile {
  id: number;
  marca: string;
  modelo: string;
}

const formatCRC = (v: number) =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

export const ImportVehiclesPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<{ imported: number; skipped: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setPreview([]);
    setImported(null);
  };

  const handlePreview = async () => {
    if (!file) return toast.error("Selecciona un archivo Excel primero.");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const [previewRes, profilesRes] = await Promise.all([
        apiClient.post("/vehicles/import/preview", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
        apiClient.get("/vehicle-profiles"),
      ]);
      setPreview(previewRes.data);
      setProfiles(profilesRes.data);
      toast.success(`${previewRes.data.length} vehículos encontrados en el Excel.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al leer el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (rowIndex: number, profileId: number) => {
    setPreview((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, profileId } : r))
    );
  };

  const handleColorChange = (rowIndex: number, color: string) => {
    setPreview((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, color } : r))
    );
  };

  const handleConfirm = async () => {
    const validRows = preview.filter((r) => !r.error);
    if (validRows.length === 0) return toast.error("No hay filas válidas para importar.");
    setLoading(true);
    try {
      const res = await apiClient.post("/vehicles/import/confirm", { rows: validRows });
      setImported(res.data);
      setPreview([]);
      setFile(null);
      toast.success(`✅ ${res.data.imported} vehículos importados, ${res.data.skipped} omitidos.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error al importar.");
    } finally {
      setLoading(false);
    }
  };

  const validRows = preview.filter((r) => !r.error);
  const errorRows = preview.filter((r) => r.error);

  return (
    <div className={styles.container}>
      <h1>Importar Inventario desde Excel</h1>
      <p className={styles.subtitle}>
        Sube el archivo Excel con el formato estándar de Conejo Motors. El sistema detectará el perfil
        automáticamente y podrás ajustarlo antes de confirmar.
      </p>

      {/* Leyenda del formato requerido */}
      <div className={styles.formatGuide}>
        <div className={styles.formatGuideHeader}>
          <LuClipboardList size={18} />
          <strong>Formato requerido del archivo Excel</strong>
        </div>
        <div className={styles.formatGuideBody}>
          <div className={styles.formatSection}>
            <p className={styles.formatSectionTitle} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><LuCircleCheck size={15} /> Hoja 1 — <code>"1030 Inventario vehiculos"</code> <span className={styles.required}>(obligatoria)</span></p>
            <p>Debe tener exactamente este nombre. Los datos comienzan en la fila 7 con las siguientes columnas en orden:</p>
            <div className={styles.columnList}>
              {["N°", "Cuenta", "Marca", "Modelo", "VIN", "Año", "Color", "Incoterm",
                "Costo Factura USD", "T/C ₡/USD", "Costo Factura CRC", "Tasa Caldera",
                "Acarreo", "Costo Nacionalización", "Inscripción + Traspaso", "Marchamo",
                "COSTO TOTAL CRC", "Estado"].map((col, i) => (
                <span key={i} className={styles.colBadge}>{col}</span>
              ))}
            </div>
          </div>
          <div className={styles.formatSection}>
            <p className={styles.formatSectionTitle} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><LuPackage size={15} /> Hoja 2 — <code>"Accesorios por Vehiculo"</code> <span className={styles.optional}>(opcional)</span></p>
            <p>Si existe, se importan automáticamente los accesorios por VIN. Los datos comienzan en la fila 7.</p>
          </div>
          <div className={styles.formatNote} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
            <LuTriangleAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} /> <span><strong>El nombre de las hojas debe ser exacto</strong>, incluyendo mayúsculas y espacios.
            El archivo puede tener más hojas — solo se leen estas dos.</span>
          </div>
        </div>
      </div>

      <div className={styles.uploadSection}>
        <label className={styles.fileLabel} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {file ? <><LuFileText size={16} /> {file.name}</> : <><LuFolderOpen size={16} /> Seleccionar archivo .xlsx</>}
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} hidden />
        </label>
        <button className="btn btn-principal" onClick={handlePreview} disabled={!file || loading}>
          {loading ? "Procesando..." : "Previsualizar"}
        </button>
      </div>

      {imported && (
        <div className={styles.resultBanner} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <LuCircleCheck size={16} /> Importación completada: <strong>{imported.imported}</strong> vehículos importados,{" "}
          <strong>{imported.skipped}</strong> omitidos (VIN duplicado o inválido).
        </div>
      )}

      {preview.length > 0 && (
        <>
          <div className={styles.summary}>
            <span className={styles.valid} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuCircleCheck size={14} /> {validRows.length} listos para importar</span>
            {errorRows.length > 0 && (
              <span className={styles.errors} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><LuTriangleAlert size={14} /> {errorRows.length} con problemas (se omitirán)</span>
            )}
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>VIN</th>
                  <th>Marca / Modelo</th>
                  <th>Año</th>
                  <th>Color</th>
                  <th>Costo USD</th>
                  <th>Costo Total CRC</th>
                  <th>Perfil del Sistema</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowIndex} className={row.error ? styles.errorRow : ""}>
                    <td>{row.numero}</td>
                    <td className={styles.vin}>{row.vin || <em>—</em>}</td>
                    <td>{row.marca} {row.modelo}</td>
                    <td>{row.año || <em style={{color:'#aaa'}}>—</em>}</td>
                    <td>
                      {!row.error && !row.color ? (
                        <input
                          type="text"
                          placeholder="⚠ Ingresar color"
                          value={row.color}
                          onChange={(e) => handleColorChange(row.rowIndex, e.target.value)}
                          className={styles.colorInput}
                        />
                      ) : row.color || <em style={{color:'#aaa'}}>—</em>}
                    </td>
                    <td>${row.costo_factura_usd?.toLocaleString()}</td>
                    <td>{formatCRC(row.costo_total_crc)}</td>
                    <td>
                      {row.error ? (
                        <span className={styles.errorBadge} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><LuTriangleAlert size={13} /> {row.error}</span>
                      ) : (
                        <select
                          value={row.profileId ?? ""}
                          onChange={(e) => handleProfileChange(row.rowIndex, Number(e.target.value))}
                          className={styles.profileSelect}
                        >
                          <option value="">— Sin perfil —</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.marca} {p.modelo}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={row.error ? styles.errorBadge : styles.okBadge} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        {row.error ? "Omitir" : (<><LuCircleCheck size={13} /> Listo</>)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.removeRowBtn}
                        onClick={() => setPreview(prev => prev.filter(r => r.rowIndex !== row.rowIndex))}
                        title="Excluir de la importación"
                      ><LuX size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <button
              className="btn btn-principal"
              onClick={handleConfirm}
              disabled={loading || validRows.length === 0}
            >
              {loading ? "Importando..." : `Confirmar e importar ${validRows.length} vehículos`}
            </button>
            <button className={styles.cancelBtn} onClick={() => { setPreview([]); setFile(null); }}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
};
