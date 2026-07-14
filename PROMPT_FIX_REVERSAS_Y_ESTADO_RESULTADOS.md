# Prompt de fix — Reversas fechadas en el período correcto + presentación del Estado de Resultados

> Pegá este prompt a tu agente de código sobre `sistema-conejo-motors`. Cambio chico y de bajo riesgo. No requiere llaves criptográficas.

## Problema (diagnóstico confirmado)
El Estado de Resultados mostró **utilidad +₡29 022 en verde (ganancia)** en un mes con ₡0 de ingresos y solo gastos → debería ser **pérdida −₡29 022 (rojo)**.

Causa raíz: `ContabilidadService.reversarAsientosPorReferencia` postea la reversa con **`fecha: hoy`** en vez de la fecha del asiento original. Cuando se edita o elimina un gasto de un mes anterior, el **crédito de la reversa cae en el mes actual** sin su débito original → la cuenta de gasto del mes queda con saldo acreedor (negativo) → la utilidad se invierte y aparece una ganancia falsa.

Evidencia: la cuenta `5500` aparece como **+₡2 500 en junio** y **−₡2 500 en julio** (mismo gasto, signo opuesto en dos meses).

Archivos: `backend/src/contabilidad/contabilidad.service.ts`, `backend/src/reports/estados-financieros.service.ts`, `frontend/src/pages/admin/EstadosFinancierosPage/index.tsx`.

---

## TAREA 1 — Fechar la reversa en el período del asiento original (fix raíz)

**Archivo:** `contabilidad/contabilidad.service.ts`, método `reversarAsientosPorReferencia`.

Hoy usa una única `fecha: hoy` para todas las reversas. Cambiarlo para que **cada reversa se feche en el período de su asiento original** (`a.fecha`), con una salvedad para períodos cerrados:

- Si el período de `a.fecha` está **abierto** → la reversa se fecha en `a.fecha` (así reversa y original se cancelan en el mismo mes).
- Si el período de `a.fecha` está **cerrado** (`periodoQueBloquea(a.fecha)` devuelve algo) → la reversa se fecha **hoy** (en el período abierto), porque no se puede alterar el resultado de un mes ya cerrado; queda como ajuste del período actual.

Esbozo:
```ts
for (const a of asientos) {
  // ...idempotencia existente...
  const bloqueado = await this.periodoQueBloquea(a.fecha);
  const fechaReversa = bloqueado ? hoy : a.fecha;
  await this.crearAsiento(user as any, {
    fecha: fechaReversa,
    descripcion: `Reversa de asiento #${a.id} — ${a.descripcion}${motivo ? ` (${motivo})` : ''}`,
    tipo: 'Ajuste',
    referencia_id: a.id,
    referencia_tipo: 'Reversa',
    lineas: a.lineas.map((l) => ({ cuentaId: l.cuenta.id, debe: Number(l.haber) || 0, haber: Number(l.debe) || 0, descripcion: `Reversa — ${l.descripcion ?? ''}` })),
  }, { forzar: true });
}
```

Esto corrige automáticamente a **todos los llamadores** de la reversa: edición/eliminación de gastos, anulación de órdenes de producto, eliminación de recibos de planilla y regeneración de liquidaciones de IVA. No hace falta tocarlos.

**Criterio de aceptación:** editar o eliminar un gasto de junio (mes abierto) genera la reversa **con fecha de junio**; julio queda intacto. El Estado de Resultados de julio ya no muestra gastos negativos ni utilidad falsa positiva. Si junio estuviera cerrado, la reversa cae en el mes abierto actual.

---

## TAREA 2 — Corregir reversas ya existentes mal fechadas (una vez)

Las reversas ya posteadas con fecha equivocada siguen distorsionando los meses. Crear un comando/endpoint de mantenimiento (solo Admin) que:
1. Busque los asientos `tipo='Ajuste'` y `referencia_tipo='Reversa'`.
2. Para cada uno, ubique el asiento original (`id = referencia_id`) y compare fechas.
3. Si difieren y el período original está **abierto**, **re-fechar la reversa** a la fecha del original (con `forzar`). Si el original está cerrado, dejarla donde está.
4. Devolver un reporte de cuántas se corrigieron.

**Criterio de aceptación:** tras correr el comando, el par 5500 (+₡2 500 junio / −₡2 500 julio) se consolida en junio; julio deja de mostrar ese −₡2 500.

---

## TAREA 3 — Presentación del Estado de Resultados

**Backend** (`reports/estados-financieros.service.ts`): sin cambios de fondo; la utilidad ya se calcula `totalIngresos − totalGastos`. Una vez aplicada la Tarea 1, los gastos dejan de salir negativos. Opcional: si una cuenta de gasto llega con saldo acreedor legítimo (p. ej. una nota de crédito de proveedor), presentarla igual pero que reduzca el total de gastos correctamente (ya ocurre).

**Frontend** (`EstadosFinancierosPage/index.tsx`, componente `Delta`): hoy colorea por el **signo numérico** (positivo verde / negativo rojo). Eso es contraintuitivo para gastos: que los gastos **bajen** debería verse favorable (verde), no rojo. Agregar una noción de **favorabilidad** por tipo de fila:

- Ingresos y Utilidad Neta: subir = favorable (verde), bajar = desfavorable (rojo).
- Gastos y Total Gastos: **invertir** el color — bajar = favorable (verde), subir = desfavorable (rojo).
- La **flecha** (▲/▼) sigue indicando la dirección real del cambio; solo cambia el color.

Esbozo:
```tsx
const Delta = ({ actual, anterior, favorableCuandoSube = true }:
  { actual: number; anterior?: number; favorableCuandoSube?: boolean }) => {
  if (anterior == null) return <span style={{ color: "#94a3b8" }}>—</span>;
  const d = +(actual - anterior).toFixed(2);
  if (Math.abs(d) < 0.01) return <span style={{ color: "#94a3b8" }}>=</span>;
  const sube = d > 0;
  const favorable = favorableCuandoSube ? sube : !sube;
  return <span style={{ color: favorable ? "#059669" : "#dc2626", fontWeight: 600 }}>{sube ? "▲" : "▼"} {CRC(Math.abs(d))}</span>;
};
```
Pasar `favorableCuandoSube={false}` en las filas y total de GASTOS; dejar el default (`true`) en INGRESOS y UTILIDAD NETA.

**Criterio de aceptación:** en un mes con solo gastos, la Utilidad Neta se muestra **negativa en rojo**; una reducción de gastos respecto al mes anterior se muestra **verde**; un aumento de gastos, rojo.

---

## Reglas y verificación
- Todos los asientos (incluidas reversas) siguen pasando por `crearAsiento` (partida doble en céntimos, respeta el bloqueo salvo `forzar` para la reversa).
- Agregar pruebas: (a) reversa de un asiento de mes abierto queda con la fecha del original; (b) reversa de un asiento de mes cerrado queda con fecha de hoy; (c) el Estado de Resultados de un mes con solo gastos da utilidad negativa.
- Verificación manual post-fix: mirar los asientos de julio de las cuentas 5400/5500/5700; ya no deberían aparecer reversas (`referencia_tipo='Reversa'`) fechadas en julio que correspondan a gastos de junio.
