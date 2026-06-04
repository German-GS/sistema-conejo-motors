/**
 * Utilidades de fecha/hora para Costa Rica (America/Costa_Rica = UTC-6, sin horario de verano).
 *
 * PROBLEMA: Los timestamps del backend vienen en UTC (ej: "2026-06-04T01:59:00.000Z").
 * Si el navegador o el servidor está en otra zona horaria, toLocaleDateString() puede
 * mostrar la fecha incorrecta. Usar siempre estas funciones en vez de new Date().toLocaleDateString().
 *
 * NOTA ESPECIAL para campos tipo DATE (solo fecha, sin hora), como fecha_expiracion:
 * PostgreSQL los devuelve como "2026-06-09" (sin tiempo ni zona). new Date("2026-06-09")
 * los interpreta como medianoche UTC → 6 PM del día anterior en CR.
 * Usar fmtFechaLocal() para esos campos.
 */

const TZ = "America/Costa_Rica";

const LOCALE = "es-CR";

/** Formatea un timestamp UTC a fecha legible en CR: "03/06/2026" */
export const fmtFecha = (isoOrDate: string | Date): string => {
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleDateString(LOCALE, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(isoOrDate);
  }
};

/** Formatea un timestamp UTC a fecha larga en CR: "miércoles, 3 de junio de 2026" */
export const fmtFechaLarga = (isoOrDate: string | Date): string => {
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleDateString(LOCALE, { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return String(isoOrDate);
  }
};

/** Formatea un timestamp UTC a fecha corta con mes abreviado: "3 jun 2026" */
export const fmtFechaCorta = (isoOrDate: string | Date): string => {
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleDateString(LOCALE, { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(isoOrDate);
  }
};

/** Formatea un timestamp UTC a hora en CR: "07:59 p. m." */
export const fmtHora = (isoOrDate: string | Date): string => {
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return d.toLocaleTimeString(LOCALE, { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

/**
 * Para campos de solo-fecha (DATE en PostgreSQL) que vienen como "2026-06-09" sin zona.
 * Agrega T12:00:00 para evitar que se interprete como medianoche UTC (= día anterior en CR).
 */
export const fmtFechaLocal = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "—";
  try {
    // Si ya tiene hora/zona (T...) tratarlo como timestamp normal
    if (dateStr.includes("T")) return fmtFecha(dateStr);
    // Solo fecha "YYYY-MM-DD" → forzar mediodía UTC para que sea seguro en cualquier TZ
    const d = new Date(`${dateStr}T12:00:00Z`);
    return d.toLocaleDateString(LOCALE, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
};

/** Retorna "hoy" en CR como string "YYYY-MM-DD" */
export const hoyEnCR = (): string => {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA da YYYY-MM-DD
};
