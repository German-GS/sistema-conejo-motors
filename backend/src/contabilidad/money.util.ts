/**
 * Utilidades de dinero basadas en aritmética de céntimos (enteros) para evitar
 * la deriva del punto flotante. Todo el ledger redondea y compara en céntimos,
 * de modo que cada línea queda exacta a 2 decimales y Σdebe = Σhaber sin residuos.
 */

/** Convierte un monto (colones) a céntimos enteros, redondeando a la baja del .5 al par más cercano no; usa redondeo comercial. */
export function toCents(n: number | string | null | undefined): number {
  const v = Number(n) || 0;
  return Math.round(v * 100);
}

/** Convierte céntimos enteros de vuelta a colones con 2 decimales. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Redondea un monto a 2 decimales de forma determinista (vía céntimos). */
export function roundMoney(n: number | string | null | undefined): number {
  return fromCents(toCents(n));
}

/** Suma una lista de montos en céntimos (enteros) y devuelve el total en colones. */
export function sumMoney(nums: Array<number | string | null | undefined>): number {
  return fromCents(nums.reduce<number>((s, n) => s + toCents(n), 0));
}
