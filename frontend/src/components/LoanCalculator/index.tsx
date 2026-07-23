// src/components/LoanCalculator/index.tsx
import { useState, useMemo, useEffect } from "react";
import apiClient from "@/api/apiClient";
import styles from "./LoanCalculator.module.css";
import { LuCalculator } from "react-icons/lu";

interface LoanCalculatorProps {
  precioBase?: number;
}

const formatCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value);

export const LoanCalculator = ({ precioBase = 0 }: LoanCalculatorProps) => {
  const [precio, setPrecio] = useState<number>(precioBase);
  const [prima, setPrima] = useState<number>(Math.round(precioBase * 0.2));
  const [plazo, setPlazo] = useState<number>(60);
  const [tasa, setTasa] = useState<number>(12);

  // Cargar defaults configurados por el admin
  useEffect(() => {
    apiClient.get("/site-settings/public").then((res) => {
      const s = res.data;
      const get = (key: string, def: number) =>
        Number(s.find((x: any) => x.key === key)?.value ?? def);
      const tasaDef  = get("calc_tasa_default", 12);
      const plazoDef = get("calc_plazo_default", 60);
      const primaPct = get("calc_prima_pct_default", 20);
      setTasa(tasaDef);
      setPlazo(plazoDef);
      if (precioBase > 0) {
        setPrima(Math.round(precioBase * primaPct / 100));
      }
    }).catch(() => {});
  }, [precioBase]);

  const resultado = useMemo(() => {
    const monto = precio - prima;
    if (monto <= 0 || plazo <= 0 || tasa <= 0) return null;

    const tasaMensual = tasa / 100 / 12;
    const cuota =
      (monto * tasaMensual * Math.pow(1 + tasaMensual, plazo)) /
      (Math.pow(1 + tasaMensual, plazo) - 1);

    const totalPagar = cuota * plazo;
    const totalIntereses = totalPagar - monto;

    return { cuota, totalPagar, totalIntereses, monto };
  }, [precio, prima, plazo, tasa]);

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <span className={styles.icon}><LuCalculator size={22} /></span>
        <div>
          <h3>Calculadora de Financiamiento</h3>
          <p>Estimación mensual de cuota</p>
        </div>
      </div>

      <div className={styles.fields}>
        {/* Precio del vehículo */}
        <div className={styles.field}>
          <label>Precio del vehículo (₡)</label>
          <input
            type="number"
            value={precio || ""}
            min={0}
            step={500000}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPrecio(v);
              setPrima(Math.round(v * 0.2));
            }}
            placeholder="Ej: 12000000"
            className={styles.input}
          />
        </div>

        {/* Prima */}
        <div className={styles.field}>
          <label>
            Prima (₡) —{" "}
            <span className={styles.hint}>
              {precio > 0 ? `${Math.round((prima / precio) * 100)}% del precio` : "0%"}
            </span>
          </label>
          <input
            type="number"
            value={prima || ""}
            min={0}
            step={100000}
            onChange={(e) => setPrima(Number(e.target.value))}
            placeholder="Ej: 2400000"
            className={styles.input}
          />
          {/* Slider de % de prima */}
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={precio > 0 ? Math.round((prima / precio) * 100) : 0}
            onChange={(e) => setPrima(Math.round((Number(e.target.value) / 100) * precio))}
            className={styles.range}
          />
          <div className={styles.rangeLabels}>
            <span>0%</span><span>80%</span>
          </div>
        </div>

        <div className={styles.row}>
          {/* Plazo */}
          <div className={styles.field}>
            <label>Plazo (meses)</label>
            <select
              value={plazo}
              onChange={(e) => setPlazo(Number(e.target.value))}
              className={styles.select}
            >
              {[12, 24, 36, 48, 60, 72, 84].map((p) => (
                <option key={p} value={p}>{p} meses ({p / 12} {p / 12 === 1 ? "año" : "años"})</option>
              ))}
            </select>
          </div>

          {/* Tasa */}
          <div className={styles.field}>
            <label>Tasa anual (%)</label>
            <input
              type="number"
              value={tasa}
              min={0}
              max={50}
              step={0.5}
              onChange={(e) => setTasa(Number(e.target.value))}
              className={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Resultado */}
      {resultado ? (
        <div className={styles.result}>
          <div className={styles.cuota}>
            <span className={styles.cuotaLabel}>Cuota mensual estimada</span>
            <span className={styles.cuotaValue}>{formatCRC(resultado.cuota)}</span>
          </div>
          <div className={styles.breakdown}>
            <div className={styles.breakdownItem}>
              <span>Monto a financiar</span>
              <strong>{formatCRC(resultado.monto)}</strong>
            </div>
            <div className={styles.breakdownItem}>
              <span>Total a pagar</span>
              <strong>{formatCRC(resultado.totalPagar)}</strong>
            </div>
            <div className={styles.breakdownItem}>
              <span>Total en intereses</span>
              <strong className={styles.intereses}>{formatCRC(resultado.totalIntereses)}</strong>
            </div>
          </div>
          <p className={styles.disclaimer}>
            * Cálculo referencial. Las condiciones finales dependen de la entidad financiera.
          </p>
        </div>
      ) : (
        <div className={styles.empty}>
          Ingrese los datos para calcular la cuota mensual.
        </div>
      )}
    </div>
  );
};
