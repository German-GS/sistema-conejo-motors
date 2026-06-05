import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import styles from "./TesoreriaPage.module.css";
import { LuPlus, LuBuilding2, LuArrowUpRight, LuArrowDownRight } from "react-icons/lu";

interface Cuenta { id: number; banco: string; numero_cuenta: string; tipo: string; moneda: string; saldo_actual: number; activa: boolean; }
interface Movimiento { id: number; tipo: string; monto: number; descripcion: string; fecha: string; referencia?: string; conciliado: boolean; }

const movTipo = ['Deposito','Retiro','Transferencia Entrada','Transferencia Salida','Pago','Cobro','Ajuste'];

export default function TesoreriaPage() {
  const [resumen, setResumen] = useState<any>({});
  const [seleccionada, setSeleccionada] = useState<Cuenta | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCuenta, setShowCuenta] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ banco: '', numero_cuenta: '', tipo: 'Corriente', moneda: 'CRC', saldo_inicial: '' });
  const [movForm, setMovForm] = useState({ tipo: 'Deposito', monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], referencia: '' });

  const cargar = async () => {
    setLoading(true);
    const r = await apiClient.get("/tesoreria/resumen");
    setResumen(r.data); setLoading(false);
  };

  const cargarMovimientos = async (c: Cuenta) => {
    setSeleccionada(c);
    const r = await apiClient.get(`/tesoreria/cuentas/${c.id}/movimientos`);
    setMovimientos(r.data);
  };

  useEffect(() => { cargar(); }, []);

  const crearCuenta = async () => {
    if (!cuentaForm.banco || !cuentaForm.numero_cuenta) return alert("Complete los campos");
    await apiClient.post("/tesoreria/cuentas", { ...cuentaForm, saldo_inicial: +cuentaForm.saldo_inicial });
    setShowCuenta(false); cargar();
  };

  const registrarMov = async () => {
    if (!movForm.monto || !seleccionada) return;
    await apiClient.post(`/tesoreria/cuentas/${seleccionada.id}/movimiento`, { ...movForm, monto: +movForm.monto });
    setShowMov(false); cargarMovimientos(seleccionada); cargar();
  };

  const esEntrada = (tipo: string) => ['Deposito','Transferencia Entrada','Cobro'].includes(tipo);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1>Tesorería y Bancos</h1><p>Control de cuentas bancarias y flujo de caja</p></div>
        <button className={styles.btnPrimary} onClick={() => setShowCuenta(true)}><LuPlus size={16} /> Nueva Cuenta</button>
      </div>

      <div className={styles.totales}>
        <div className={styles.totalCard}><div className={styles.totalLabel}>Total CRC</div><div className={styles.totalVal}>₡{(resumen.totalCRC||0).toLocaleString('es-CR')}</div></div>
        <div className={styles.totalCard}><div className={styles.totalLabel}>Total USD</div><div className={styles.totalVal}>${(resumen.totalUSD||0).toLocaleString('en-US')}</div></div>
      </div>

      <div className={styles.layout}>
        <div className={styles.cuentasList}>
          {loading ? <p>Cargando...</p> : (resumen.cuentas || []).map((c: Cuenta) => (
            <div key={c.id} className={`${styles.cuentaCard} ${seleccionada?.id === c.id ? styles.activa : ''}`} onClick={() => cargarMovimientos(c)}>
              <div className={styles.cuentaTop}><LuBuilding2 size={18} className={styles.bancoIcon} /><span className={styles.monedaBadge}>{c.moneda}</span></div>
              <div className={styles.banco}>{c.banco}</div>
              <div className={styles.cuenta}>{c.numero_cuenta}</div>
              <div className={styles.saldo}>₡{(+c.saldo_actual).toLocaleString('es-CR')}</div>
              <div className={styles.tipo}>{c.tipo}</div>
            </div>
          ))}
        </div>

        <div className={styles.movPanel}>
          {!seleccionada ? <div className={styles.placeholder}>← Selecciona una cuenta</div> : (
            <>
              <div className={styles.movHeader}>
                <h2>Movimientos — {seleccionada.banco}</h2>
                <button className={styles.btnPrimary} onClick={() => setShowMov(true)}><LuPlus size={14} /> Movimiento</button>
              </div>
              <div className={styles.movLista}>
                {movimientos.length === 0 && <p className={styles.empty}>Sin movimientos</p>}
                {movimientos.map(m => (
                  <div key={m.id} className={styles.movRow}>
                    <div className={styles.movIcon} style={{ background: esEntrada(m.tipo) ? '#d1fae5' : '#fee2e2' }}>
                      {esEntrada(m.tipo) ? <LuArrowUpRight size={16} color="#059669" /> : <LuArrowDownRight size={16} color="#ef4444" />}
                    </div>
                    <div className={styles.movInfo}>
                      <div className={styles.movDesc}>{m.descripcion}</div>
                      <div className={styles.movMeta}>{m.tipo} • {m.fecha}{m.referencia ? ` • ${m.referencia}` : ''}{m.conciliado ? ' ✓' : ''}</div>
                    </div>
                    <div className={`${styles.movMonto} ${esEntrada(m.tipo) ? styles.entrada : styles.salida}`}>
                      {esEntrada(m.tipo) ? '+' : '-'}₡{(+m.monto).toLocaleString('es-CR')}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showCuenta && (
        <div className={styles.overlay} onClick={() => setShowCuenta(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nueva Cuenta Bancaria</h2>
            <div className={styles.row}><div className={styles.fg}><label>Banco *</label><input value={cuentaForm.banco} onChange={e => setCuentaForm({...cuentaForm, banco: e.target.value})} /></div><div className={styles.fg}><label>N° Cuenta *</label><input value={cuentaForm.numero_cuenta} onChange={e => setCuentaForm({...cuentaForm, numero_cuenta: e.target.value})} /></div></div>
            <div className={styles.row}><div className={styles.fg}><label>Tipo</label><select value={cuentaForm.tipo} onChange={e => setCuentaForm({...cuentaForm, tipo: e.target.value})}>{['Corriente','Ahorro','Dolares','Colones'].map(t=><option key={t}>{t}</option>)}</select></div><div className={styles.fg}><label>Moneda</label><select value={cuentaForm.moneda} onChange={e => setCuentaForm({...cuentaForm, moneda: e.target.value})}><option>CRC</option><option>USD</option></select></div></div>
            <div className={styles.fg}><label>Saldo Inicial</label><input type="number" value={cuentaForm.saldo_inicial} onChange={e => setCuentaForm({...cuentaForm, saldo_inicial: e.target.value})} /></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowCuenta(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={crearCuenta}>Guardar</button></div>
          </div>
        </div>
      )}

      {showMov && (
        <div className={styles.overlay} onClick={() => setShowMov(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nuevo Movimiento</h2>
            <div className={styles.fg}><label>Tipo</label><select value={movForm.tipo} onChange={e => setMovForm({...movForm, tipo: e.target.value})}>{movTipo.map(t=><option key={t}>{t}</option>)}</select></div>
            <div className={styles.fg}><label>Monto *</label><input type="number" value={movForm.monto} onChange={e => setMovForm({...movForm, monto: e.target.value})} /></div>
            <div className={styles.fg}><label>Descripción *</label><input value={movForm.descripcion} onChange={e => setMovForm({...movForm, descripcion: e.target.value})} /></div>
            <div className={styles.row}><div className={styles.fg}><label>Fecha</label><input type="date" value={movForm.fecha} onChange={e => setMovForm({...movForm, fecha: e.target.value})} /></div><div className={styles.fg}><label>Referencia</label><input value={movForm.referencia} onChange={e => setMovForm({...movForm, referencia: e.target.value})} /></div></div>
            <div className={styles.mActions}><button className={styles.btnSecondary} onClick={() => setShowMov(false)}>Cancelar</button><button className={styles.btnPrimary} onClick={registrarMov}>Registrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
