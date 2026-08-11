import { useState, useEffect, useRef } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuReceiptText, LuUpload } from "react-icons/lu";

const card: React.CSSProperties = { background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12, padding: "1.25rem" };
const th: React.CSSProperties = { padding: "8px 10px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--slate-500)", textAlign: "left" };
const td: React.CSSProperties = { padding: "8px 10px", color: "var(--slate-700)", fontSize: "0.85rem" };

const tarifaPct = (imp: number) => `${(Number(imp) * 100).toFixed(imp && imp < 0.01 ? 1 : 0)}%`;

export const FacturacionElectronicaPage = () => {
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargarEstado = async () => {
    try {
      const res = await apiClient.get("/cabys/estado");
      setTotal(res.data.total);
    } catch { /* silencioso */ }
  };
  useEffect(() => { cargarEstado(); }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await apiClient.get(`/cabys/buscar?q=${encodeURIComponent(term)}`);
        setResultados(res.data);
      } catch { /* silencioso */ } finally { setBuscando(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const importar = async (file: File) => {
    setImportando(true);
    const tId = toast.loading("Importando catálogo CABYS… (puede tardar)");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiClient.post("/cabys/importar", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Catálogo importado: ${res.data.importados.toLocaleString("es-CR")} códigos.`, { id: tId });
      cargarEstado();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "No se pudo importar el catálogo.", { id: tId });
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h1 style={{ margin: 0, color: "var(--brand-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}><LuReceiptText size={22} /> Facturación Electrónica — Catálogo CABYS</h1>

      {/* Aviso modo interino */}
      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 12, padding: "0.9rem 1.1rem" }}>
        <strong>Modo interino (sin llaves):</strong> los comprobantes se generan con estructura v4.4 real
        pero quedan como <strong>Borrador — no válidos para efectos tributarios</strong> (numeración provisional,
        sin firma ni transmisión a Hacienda). Al recibir el certificado <code>.p12</code> se activa la firma y el envío.
      </div>

      {/* Estado del catálogo + import */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--slate-500)" }}>Códigos CABYS cargados</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-dark)" }}>{total === null ? "…" : total.toLocaleString("es-CR")}</div>
            {total !== null && total < 100 && (
              <div style={{ fontSize: "0.78rem", color: "#92400e", marginTop: 4 }}>Solo está la semilla del negocio. Importá el Excel oficial para el catálogo completo (~20.500 códigos).</div>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={importando}
              style={{ background: "var(--brand)", border: "none", color: "#fff", borderRadius: 8, padding: "0.6rem 1.1rem", cursor: importando ? "wait" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {importando ? "Importando…" : (<><LuUpload size={16} /> Importar catálogo (Excel)</>)}
            </button>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div style={card}>
        <strong style={{ fontSize: "1rem", color: "var(--brand-dark)" }}>Buscar código CABYS</strong>
        <p style={{ fontSize: "0.8rem", color: "var(--slate-500)", margin: "0.25rem 0 0.75rem" }}>Por código (dígitos) o por descripción. Muestra la tarifa de IVA sugerida.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: 4911315000000  ·  vehículo eléctrico  ·  mantenimiento"
          style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.9rem", boxSizing: "border-box" }} />
        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr><th style={th}>Código</th><th style={th}>Descripción</th><th style={{ ...th, textAlign: "right" }}>IVA</th></tr></thead>
            <tbody>
              {buscando && <tr><td style={td} colSpan={3}>Buscando…</td></tr>}
              {!buscando && q.trim() && resultados.length === 0 && <tr><td style={td} colSpan={3}>Sin coincidencias.</td></tr>}
              {resultados.map((c) => (
                <tr key={c.codigo} style={{ borderTop: "1px solid var(--slate-100)" }}>
                  <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{c.codigo}</td>
                  <td style={td}>{c.descripcion}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{tarifaPct(c.impuesto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacturacionElectronicaPage;
