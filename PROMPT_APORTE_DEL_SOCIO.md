# Prompt — Clasificación de gastos pagados por el socio (aporte del dueño)

> Pegá este prompt a tu agente de código sobre `sistema-conejo-motors`. No requiere llaves criptográficas.
>
> **IMPORTANTE:** las cuentas contables las crea el usuario manualmente desde la UI (el sistema ya permite crear cuentas). Este prompt **NO debe sembrar ni crear cuentas en código**: solo debe **referenciarlas por código** a través de settings, y validar que existan (si no existen, devolver un error claro pidiendo crearlas primero).

## Escenario
Los gastos actuales los pagó el dueño de su bolsillo; la empresa aún no tiene caja ni cuentas bancarias. Por eso Caja (1100) y Banco (1110) están en negativo. Hay que registrar esos gastos como **financiamiento del socio** en una **cuenta puente**, hasta que una reunión defina si es préstamo (pasivo) o aporte de capital (patrimonio). La decisión final = a qué cuenta se reclasifica; no debe estar hardcodeada.

Archivos probables: `gastos/gastos.service.ts` (`codigoContrapartida`), el formulario de gasto en el frontend, `site-settings/`, y `contabilidad/` para los endpoints de reclasificación.

---

## TAREA 1 — Settings con los códigos de cuenta (no crear cuentas)
En `site-settings` (o config equivalente), agregar dos parámetros editables por Admin:
- `cuenta_financiamiento_socio` — cuenta **puente** donde caen los gastos pagados por el dueño. Default sugerido `'2900'`. **El usuario crea esa cuenta manualmente** (p. ej. `2900 Financiamiento del socio (por clasificar)`).
- `cuenta_destino_socio` — cuenta **final** tras la reunión (`2150` CxP Socios si es préstamo, o `3150` Aportes por capitalizar si es patrimonio). Vacío hasta que se decida.

Regla: cualquier operación que use estas cuentas debe **verificar que existan** (`cuentasRepo.findOneBy({ codigo })`); si no, lanzar `BadRequestException` con un mensaje tipo "Creá primero la cuenta {codigo} en el plan de cuentas".

---

## TAREA 2 — Método de pago "Aporte del socio / Pagado por el dueño"
1. Agregar la opción a los métodos de pago del gasto: en el **enum/lista del backend** y en el **dropdown del formulario de gasto** en el frontend. Etiqueta: "Aporte del socio (pagado por el dueño)".
2. En `gastos.service.ts → codigoContrapartida(metodo)`, mapear este método al código de `cuenta_financiamiento_socio` (leído del setting, no hardcodeado). Así el asiento del gasto queda:
   ```
   Debe  5xxx  Gasto                          (monto sin IVA)
   Debe  1210  IVA Acreditable                (si aplica)
   Haber 2900  Financiamiento del socio       (total pagado por el dueño)
   ```
   En vez de acreditar Caja/Banco. Esto detiene desde ya que la caja siga en negativo.

**Criterio de aceptación:** registrar un gasto con método "Aporte del socio" acredita la cuenta puente (del setting), no 1100/1110; y falla con mensaje claro si la cuenta puente no existe.

---

## TAREA 3 — Reclasificar los saldos negativos actuales (Caja/Banco → puente)
Endpoint Admin (p. ej. `POST /contabilidad/reclasificar-caja-a-socio`) que:
1. Calcule el saldo actual en el mayor de `1100` y `1110`.
2. Para cada cuenta con **saldo acreedor (negativo)**, postee un asiento que la lleve a cero contra la cuenta puente:
   ```
   Debe  1100 Caja      (|saldo negativo|)
   Debe  1110 Banco     (|saldo negativo|)
   Haber 2900 Financiamiento del socio   (suma)
   ```
3. Idempotente: marcar con `referencia_tipo: 'ReclasificacionCajaSocio'` + `referencia_id` = un identificador de la corrida (o la fecha), y no duplicar si ya se hizo para esos saldos. Todo por `crearAsiento`.
4. Devolver un resumen (cuánto movió por cuenta).

**Criterio de aceptación:** tras correrlo, 1100 y 1110 quedan en 0 (o su saldo real positivo si lo hubiera) y la cuenta puente refleja lo que financió el dueño; el balance sigue cuadrando.

---

## TAREA 4 — Acción de reclasificación final (post-reunión): puente → destino
Endpoint Admin (p. ej. `POST /contabilidad/reclasificar-socio-a-destino`) que:
1. Valide que `cuenta_destino_socio` esté configurado y que la cuenta exista (2150 o 3150).
2. Lea el saldo de la cuenta puente y postee:
   ```
   Debe  2900 Financiamiento del socio   (saldo puente)
   Haber {cuenta_destino_socio}          (mismo monto)
   ```
   - Si el destino es `2150` (pasivo), queda como deuda con el socio.
   - Si el destino es `3150` (patrimonio), queda como aporte por capitalizar.
3. Idempotente (`referencia_tipo: 'ReclasificacionSocioDestino'`). Todo por `crearAsiento`.

Este es el "botón" que se aprieta después de la reunión; hasta entonces el saldo vive en la cuenta puente sin problema.

**Criterio de aceptación:** con `cuenta_destino_socio` en 2150 (o 3150) y la cuenta creada, la acción vacía la cuenta puente hacia el destino en un solo asiento; sin el setting o sin la cuenta, falla con mensaje claro.

---

## Reglas transversales
- **No crear ni sembrar cuentas en código.** Solo referenciarlas por código desde los settings y validar que existan.
- Todos los asientos pasan por `ContabilidadService.crearAsiento` (partida doble en céntimos, respeta el bloqueo de período; usar `forzar` solo si hace falta reclasificar dentro de un mes cerrado, y en ese caso fecharlo en el período abierto actual).
- Todas las acciones de reclasificación: solo Admin, idempotentes por `referencia_tipo`/`referencia_id`.
- Migración TypeORM si agregás columnas/valores de enum.
- Pruebas: (a) gasto con método "Aporte del socio" acredita la cuenta del setting; (b) reclasificación de caja negativa deja 1100/1110 en cero; (c) reclasificación final vacía la puente al destino; (d) todas fallan con mensaje claro si falta la cuenta.
