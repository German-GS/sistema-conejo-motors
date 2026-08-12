import { useState, useEffect, useRef, useCallback } from "react";
import apiClient from "@/api/apiClient";
import toast from "react-hot-toast";
import { LuBanknote, LuUpload, LuLink, LuCircleCheck } from "react-icons/lu";
import { Button, PageHeader, Table } from "@/components/ui";

const CRC = (v: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(v) || 0);
const card: React.CSSProperties = { background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12, padding: "1.25rem" };
const thR: React.CSSProperties = { textAlign: "right" };
const tdR: React.CSSProperties = { textAlign: "right" };
const inp: React.CSSProperties = { padding: "0.45rem 0.6rem", borderRadius: 8, border: "1.5px solid var(--slate-200)", fontSize: "0.9rem", fontFamily: "inherit" };
const hoy = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => hoy().slice(0, 8) + "01";

export const ConciliacionPage = () => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cuentaId, setCuentaId] = useState<number | null>(null);
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [rep, setRep] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get("/tesoreria/cuentas").then((r) => {
      setCuentas(r.data ?? []);
      if (r.data?.[0]) setCuentaId(r.data[0].id);
    }).catch(() => toast.error("No se pudieron cargar las cuentas bancarias."));
  }, []);

  const cargarReporte = useCallback(async () => {
    if (!cuentaId) return;
    try {
      const r = await apiClient.get(`/conciliacion/${cuentaId}/reporte?desde=${desde}&hasta=${hasta}`);
      setRep(r.data);
    } catch { /* silencioso */ }
  }, [cuentaId, desde, hasta]);

  useEffect(() => { cargarReporte(); }, [cargarReporte]);

  const importar = async (file: File) => {
    if (!cuentaId) return;
    setBusy(true);
    const tId = toast.loading("Importando estado de cuenta…");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await apiClient.post(`/conciliacion/${cuentaId}/importar`, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`${r.data.importados} movimientos importados.`, { id: tId });
      cargarReporte();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al importar.", { id: tId }); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const conciliar = async () => {
    if (!cuentaId) return;
    setBusy(true);
    const tId = toast.loading("Conciliando…");
    try {
      const r = await apiClient.post(`/conciliacion/${cuentaId}/conciliar`, { desde, hasta, tolerancia: 3 });
      toast.success(`${r.data.conciliados} movimientos conciliados.`, { id: tId });
      setRep(r.data);
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al conciliar.", { id: tId }); }
    finally { setBusy(false); }
  };

  const crearAsiento = async (movId: number) => {
    try {
      await apiClient.post(`/conciliacion/movimiento/${movId}/asiento`, {});
      toast.success("Asiento creado y movimiento conciliado.");
      cargarReporte();
    } catch (e: any) { toast.error(e.response?.data?.message || "Error al crear el asiento."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader title={<><LuBanknote size={22} /> Conciliación Bancaria</>} />

      <div style={card}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <select style={{ ...inp, minWidth: 220 }} value={cuentaId ?? ""} onChange={(e) => setCuentaId(Number(e.target.value))}>
            {cuentas.length === 0 && <option value="">Sin cuentas bancarias registradas</option>}
            {cuentas.map((c) => <option key={c.id} value={c.id}>{c.banco} · {c.numero_cuenta} ({c.moneda})</option>)}
          </select>
          {cuentas.length === 0 && (
            <span style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
              Registrá una cuenta bancaria primero en <a href="/admin/tesoreria" style={{ color: "var(--brand)" }}>Tesorería</a>.
            </span>
          )}
          <input type="date" style={inp} value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" style={inp} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); }} />
          <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()} icon={<LuUpload size={16} />}>Importar extracto (CSV)</Button>
          <Button variant="primary" disabled={busy} onClick={conciliar} icon={<LuLink size={16} />}>Conciliar automáticamente</Button>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--slate-400)", margin: "0.6rem 0 0" }}>
          CSV: <code>fecha,descripcion,monto,referencia</code> — monto firmado (+ entrada / − salida). Ej: <code>2026-05-10,Depósito cliente,150000,REF123</code>
        </p>
      </div>

      {rep && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {[
              ["Saldo según libros", rep.saldoLibros, "var(--brand)"],
              ["(−) En libros no en banco", rep.partidasLibrosNoBanco, "#b45309"],
              ["(+) En banco no en libros", rep.partidasBancoNoLibros, "#b45309"],
              ["= Saldo según banco", rep.saldoBanco, "var(--success)"],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ ...card, padding: "0.9rem 1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--slate-500)" }}>{l as string}</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: c as string }}>{CRC(v as number)}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <strong style={{ color: "var(--brand-dark)" }}>En libros, no en banco (en tránsito)</strong>
            <div style={{ marginTop: "0.5rem" }}>
              <Table>
                <thead><tr><th>Fecha</th><th>Asiento</th><th>Descripción</th><th style={thR}>Monto</th></tr></thead>
                <tbody>
                  {rep.enLibrosNoEnBanco.length === 0 && <tr><td colSpan={4}>Nada pendiente. <LuCircleCheck size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></td></tr>}
                  {rep.enLibrosNoEnBanco.map((l: any) => (
                    <tr key={l.lineaId}>
                      <td>{l.fecha}</td><td>#{l.asientoId}</td><td>{l.descripcion}</td>
                      <td style={tdR}>{CRC(l.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>

          <div style={card}>
            <strong style={{ color: "var(--brand-dark)" }}>En banco, no en libros (comisiones, intereses)</strong>
            <div style={{ marginTop: "0.5rem" }}>
              <Table>
                <thead><tr><th>Fecha</th><th>Descripción</th><th style={thR}>Monto</th><th></th></tr></thead>
                <tbody>
                  {rep.enBancoNoEnLibros.length === 0 && <tr><td colSpan={4}>Nada pendiente. <LuCircleCheck size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></td></tr>}
                  {rep.enBancoNoEnLibros.map((m: any) => (
                    <tr key={m.id}>
                      <td>{m.fecha}</td><td>{m.descripcion}</td>
                      <td style={{ ...tdR, color: m.monto < 0 ? "var(--danger)" : "var(--success)" }}>{CRC(m.monto)}</td>
                      <td style={tdR}>
                        <Button size="sm" variant="primary" onClick={() => crearAsiento(m.id)}>
                          Crear asiento
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConciliacionPage;
