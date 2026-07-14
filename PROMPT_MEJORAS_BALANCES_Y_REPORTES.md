# Prompt de mejoras — Balances, Flujo de Caja, Multimoneda, Conciliación y Reportes

> Pegá este prompt a tu agente de código sobre `sistema-conejo-motors`. Todo lo aquí descrito **NO requiere el certificado `.p12` ni conexión con Hacienda**. Ejecutar por partes, en orden. Mantené las reglas del motor contable: todo asiento pasa por `ContabilidadService.crearAsiento` (respeta partida doble en céntimos y bloqueo de período).

## Contexto
Backend NestJS + TypeORM. Ya existen: `contabilidad/` (mayor, `getBalance`, `movimientosPorCuenta`, cierres), `reports/estados-financieros.service.ts` (Estado de Resultados, Balance General y Flujo de Caja simples), `tesoreria/` (`cuenta-bancaria` con `moneda`/`saldo_actual`, `movimiento-bancario` con `conciliado`), `cxc/`/`cxp/` (con `fecha_vencimiento`, `fecha_emision`, `saldo_pendiente`, cliente/proveedor, `estado`). Reutilizá todo eso; no dupliques lógica.

---

## PARTE A — Balance General clasificado (corriente / no corriente)

**Objetivo:** presentar el Balance General en formato NIIF, separando corriente de no corriente, en vez de un listado plano por tipo.

**Datos:** agregar a `contabilidad/cuenta.entity.ts`:
- `clasificacion_balance: 'Corriente' | 'NoCorriente' | null` (para Activo/Pasivo).
- Sembrar el default en `seedCuentasEstandar` y en un backfill idempotente al bootstrap:
  - Activo Corriente: 1100, 1110, 1120, 1200, 1210, 1300, 1400.
  - Activo No Corriente: 1500, 1510, 1520, 1525, 1590 (activos fijos y sus contra-activos).
  - Pasivo Corriente: 2100, 2200, 2210, 2300.
  - Pasivo No Corriente: deuda a largo plazo (crear cuenta 2400 si aplica).

**Lógica:** en `estados-financieros.service.ts → balanceGeneral`, agrupar:
- Activo → { corriente[], noCorriente[], totalCorriente, totalNoCorriente, total }.
- Pasivo → { corriente[], noCorriente[], ... }.
- Patrimonio (igual que hoy, incluye utilidad del ejercicio).
- Mostrar los contra-activos (1525, 1590) restando dentro de No Corriente (activo fijo neto).

**Criterio de aceptación:** el Balance devuelve activos y pasivos segmentados; `totalActivos == totalPasivos + totalPatrimonio` sigue cuadrando exacto; el Excel muestra las subsecciones con sus subtotales.

---

## PARTE B — Flujo de Caja por el método indirecto (operación / inversión / financiamiento)

**Objetivo:** reemplazar el "flujo = variación de cuentas de efectivo" por un **Estado de Flujo de Efectivo** real, método indirecto, con las tres secciones, y que **cuadre** contra la variación directa de caja (que ya calculás; usala como validación).

**Lógica (en `estados-financieros.service.ts → flujoCaja`):**
1. **Operación**: partir de la utilidad neta del período (de `estadoResultados`), + ajustes no monetarios (**depreciación**, cuenta 5450) y +/- **variación del capital de trabajo** en el período (cambios en 1200 CxC, 1300/1400 inventarios, 1210 IVA acreditable, 2100 CxP, 2200/2210 IVA por pagar). Convención: aumento de activo operativo = salida de caja; aumento de pasivo operativo = entrada.
2. **Inversión**: variación de activos fijos y demos (1510, 1520, 1500) — compras (salida) y ventas/bajas (entrada), netas de depreciación.
3. **Financiamiento**: variación de capital (3100), utilidades retenidas por dividendos (3200), y deuda a largo plazo (2400 si existe).
4. **Cuadre**: `flujoOperación + flujoInversión + flujoFinanciamiento` debe igualar la **variación neta de efectivo** (cuentas 1100/1110/1120) del período. Incluir en la respuesta un campo `cuadra: boolean` y la diferencia; si no cuadra, marcarlo (partidas sin clasificar).

**Datos:** para clasificar cada cuenta en su sección, agregar a `cuenta.entity.ts` un campo `flujo_categoria: 'Operacion' | 'Inversion' | 'Financiamiento' | null` y sembrarlo por defecto (efectivo queda fuera; es el objeto del flujo).

**Criterio de aceptación:** para un período con ventas, una compra de activo fijo y depreciación, las tres secciones suman exactamente la variación de caja del período (`cuadra = true`).

---

## PARTE C — Multimoneda CRC/USD + diferencial cambiario

**Objetivo:** manejar operaciones en USD (importás vehículos) manteniendo el mayor en CRC (moneda funcional) y reconociendo automáticamente el diferencial cambiario.

**Datos:**
- `cuenta-bancaria` ya tiene `moneda`. Agregar `moneda` y `tipo_cambio` a los documentos que puedan ser en USD (CxC, CxP, movimientos bancarios). El **mayor siempre se postea en CRC** (monto USD × tipo de cambio de la fecha).
- Guardar en cada línea de origen el monto en moneda original + tipo de cambio usado, para trazabilidad.

**Lógica de diferencial cambiario (cron de fin de mes o al cierre de período):**
- Revaluar los **saldos monetarios en USD** (banco USD, CxC/CxP en USD) al **tipo de cambio de cierre** del período.
- La diferencia contra el valor en libros en CRC se postea:
  - Pérdida cambiaria → Debe **5600 Gastos Financieros** / Haber la cuenta monetaria.
  - Ganancia cambiaria → Debe la cuenta monetaria / Haber **4300 Otros Ingresos** (o crear 4310 "Diferencial Cambiario").
- Idempotente por período (`referencia_tipo: 'DiferencialCambiario'`, `referencia_id: periodo`).

**Tipo de cambio:** integrar el tipo de cambio de venta del **BCCR** (ya usás `tipo_cambio` en vehículos). Ideal: un `TipoCambioService` que consulte el indicador del BCCR y cachee el valor diario; con fallback a carga manual.

**Criterio de aceptación:** una CxP en USD registrada a ₡500 y revaluada a ₡520 al cierre genera un asiento de pérdida cambiaria por la diferencia, sin duplicarse si el cron corre dos veces.

---

## PARTE D — Conciliación bancaria

**Objetivo:** conciliar los movimientos del mayor (cuentas 1110/1120) contra el estado de cuenta del banco.

**Lógica:**
- Importar el estado de cuenta (CSV/OFX) a `movimiento-bancario` (ya tiene `conciliado`).
- **Matching automático** por monto + fecha (± tolerancia de días) contra los movimientos contables de la cuenta de banco; marcar `conciliado = true` los que casen.
- Dejar en dos listas los no conciliados: en libros pero no en banco (cheques/transferencias en tránsito) y en banco pero no en libros (comisiones, intereses no registrados).
- **Reporte de conciliación**: saldo según libros → +/- partidas conciliatorias → saldo según banco. Exportable.
- Para las partidas "en banco no en libros" (comisiones bancarias, etc.), ofrecer crear el asiento faltante en un clic (Debe 5600 / Haber banco).

**Criterio de aceptación:** tras importar un extracto, los movimientos coincidentes quedan `conciliado=true` y el reporte muestra saldo libros vs. banco con las partidas conciliatorias listadas.

---

## PARTE E — Reportes contables estándar (los que espera un contador)

Agregar en `reports/` (reutilizando `movimientosPorCuenta` y `getBalance`):

1. **Balanza de comprobación**: todas las cuentas con débitos, créditos y saldo deudor/acreedor a una fecha; totales deudores = totales acreedores. Export Excel.
2. **Libro Mayor por cuenta**: movimientos detallados (fecha, asiento, descripción, debe, haber, saldo corrido) de una cuenta en un rango.
3. **Libro Diario**: ya existe (`getAsientos`); agregar export Excel/PDF del rango.
4. **Antigüedad de saldos (aging) CxC y CxP**: usar `fecha_vencimiento`/`saldo_pendiente` para agrupar en tramos (Corriente, 1-30, 31-60, 61-90, +90 días) por cliente/proveedor. Muy valioso para cobros/pagos.

**Criterio de aceptación:** la balanza cuadra (Σdébitos = Σcréditos); el aging suma exactamente el saldo total de CxC/CxP; todos exportan a Excel.

---

## PARTE F — Ajustes menores

- **Depreciación fiscal de Herramientas / Equipo de comunicación** (`depreciacion.service.ts`): confirmar contra el Anexo Nº 2 si algún bien individualizado va a 25%/4 años en vez de 10%/10; ajustar `vida_util_fiscal_meses`/`tasa_anual` por caso. Ya está el comentario; falta decidir con el contador.
- **Balance General**: mostrar la ecuación `Activo = Pasivo + Patrimonio` como línea de verificación explícita, no solo el flag `equilibrado`.

---

## Orden sugerido
1. Parte A (Balance clasificado) y Parte E (reportes estándar) — alto valor, bajo riesgo, reutilizan lo existente.
2. Parte B (Flujo indirecto con cuadre).
3. Parte D (Conciliación bancaria).
4. Parte C (Multimoneda + diferencial cambiario) — la más grande; hacela como fase propia.
5. Parte F (ajustes).

## Reglas para todas las partes
- Todo asiento por `crearAsiento` (partida doble en céntimos, respeta bloqueo de período).
- Los nuevos asientos automáticos deben ser **idempotentes** por `referencia_tipo`/`referencia_id`.
- Agregar migración TypeORM por cada columna nueva.
- Pruebas unitarias de los cálculos (clasificación de balance, cuadre de flujo, revaluación cambiaria, aging).
