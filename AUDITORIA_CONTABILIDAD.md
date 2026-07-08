# Auditoría del ciclo contable — Sistema Conejo Motors

Revisión del backend (NestJS) enfocada en contabilidad, activos fijos y la automatización del ciclo contable. Fecha: 2026-07-08.

Archivos revisados: `contabilidad/*`, `activos-fijos/*`, y los generadores automáticos de asientos en `vehicles/`, `facturacion/`, `productos/`, `gastos/`, `recibos_pago/`, además de `cxc/` y `cxp/`.

---

## Veredicto general

El diseño base es sólido y va en la dirección correcta: partida doble validada en un único punto de entrada, plan de cuentas coherente, cuentas de contra-activo para depreciación acumulada, asientos ligados a su documento de origen (`referencia_tipo` + `referencia_id`), patrón de idempotencia y posteo automático desde compras, ventas, gastos, planilla, activos y depreciación por cron.

Sin embargo, **el ciclo no está cerrado como ciclo**. Faltan tres cosas que la contabilidad formal exige: bloqueo de períodos, asiento de cierre real, y reversas consistentes ante anulaciones. Y hay omisiones de fondo en planilla (cargas patronales) y en la liquidación de CxC/CxP. Todo esto es corregible sin rediseñar el modelo.

Clasifico los hallazgos por severidad.

---

## Lo que está bien hecho

**Partida doble en un solo punto.** `crearAsiento` valida `Σdebe = Σhaber` con tolerancia de 0.01 antes de persistir. Todos los módulos pasan por aquí, así que ningún asiento descuadrado entra al libro. Correcto.

**Trazabilidad.** Cada asiento guarda `referencia_tipo`/`referencia_id`, lo que permite localizar, revisar y revertir el asiento de un documento. Es la base para todo lo demás.

**Idempotencia (parcial).** `existeAsientoPorReferencia` evita duplicar el asiento de compra/apertura de un vehículo si el proceso se reejecuta. Buen patrón.

**Costeo e inventario perpetuo.** La compra de vehículo capitaliza el landed cost a inventario (1300) con desglose por componente, separa el IVA de importación a *IVA acreditable* (1210) en lugar de capitalizarlo, y la venta reconoce costo de ventas contra inventario en el mismo momento (5100 / 1300). Es el tratamiento correcto.

**Depreciación automatizada.** Cron mensual de línea recta con cuenta de gasto (5450) y contra-activo (1525/1590), con control de `ultimo_periodo_depreciado` para no duplicar en el mes. Buen enfoque.

---

## Hallazgos críticos

### 1. No existe bloqueo de período cerrado
`generarCierre` marca el día como `cerrado = true`, pero `crearAsiento` **nunca consulta esa bandera**. Se puede seguir posteando —o retro-fechando— asientos a un día ya "cerrado". El cierre es hoy una foto de resumen, no un candado.

Consecuencia: los reportes de un período pueden cambiar después de haberlo cerrado. Es la debilidad de control más importante.

Recomendación: en `crearAsiento`, rechazar (o exigir rol elevado + asiento de ajuste marcado) cualquier `fecha` que caiga en un período con cierre `cerrado`. Idealmente pasar a un concepto de cierre **mensual** bloqueante además del diario.

### 2. El "cierre" no genera asiento de cierre
`cierres_diarios` guarda totales de ingresos/gastos/utilidad, pero **no postea el asiento que lleva Ingresos y Gastos a resultados (3300 / 3200)**. Las cuentas de resultado nunca se saldan; la utilidad se calcula al vuelo en `getBalance` y la ecuación patrimonial se "cuadra" sumando ese término calculado.

Para un P&L corriente funciona, pero no hay cierre de ejercicio: al cambiar de año, Ingresos y Gastos arrastran saldo. Falta el asiento anual de cierre a Utilidades Retenidas.

Recomendación: agregar un cierre de período (mensual/anual) tipo `Cierre` que salde 4xxx/5xxx contra 3300, y traslade 3300 a 3200 en el cierre anual.

### 3. Anulaciones y ediciones no revierten el asiento
- **`productos.anularOrden`** devuelve stock pero **no revierte** el asiento de venta → ingreso y costo fantasma en libros.
- **`gastos.update` / `gastos.remove`** no re-postea ni elimina el asiento → asientos huérfanos o desactualizados si cambia el monto o se borra el gasto.
- Solo `recibos_pago.remove` revierte (vía `eliminarAsientosPorReferencia`). La inconsistencia es el problema: unos módulos revierten y otros no.

Recomendación: toda anulación/edición con impacto contable debe generar reversa. Y ver punto 8: la reversa debería ser un asiento contrario, no un borrado físico.

### 4. Cobro de CxC y pago de CxP no generan asientos
`cxc/` y `cxp/` **no referencian contabilidad** (0 llamadas). Una venta a crédito debita 1200 (CxC) al facturar, pero cuando el cliente paga, **nada mueve 1200 → Caja/Banco**. La CxC en el mayor nunca se descarga; el banco no refleja el ingreso. Igual para CxP: la compra acredita 2100, pero el pago al proveedor no lo debita.

Consecuencia: 1200 y 2100 se inflan indefinidamente y el efectivo no cuadra con la realidad.

Recomendación: al registrar un `PagoCxC`, postear Debe Caja/Banco / Haber 1200. Al registrar un `PagoCxP`, Debe 2100 / Haber Caja/Banco.

### 5. Planilla no reconoce las cargas patronales
`planilla-calculation.service` **sí calcula** las cargas patronales (`calculateCargasPatronales`, ~26% en CR), pero `_registrarAsientoPlanilla` **solo asienta el salario bruto** como gasto. La contribución patronal (CCSS, INS, etc.) —que es gasto de la empresa y pasivo por pagar— no entra a los libros. Tampoco se provisionan aguinaldo ni vacaciones.

Consecuencia: gasto de personal y pasivos subvaluados de forma material.

Recomendación: agregar al asiento de planilla: Debe 5300 (cargas patronales) / Haber 2100 (por pagar a CCSS). Provisionar aguinaldo (1/12 mensual) y vacaciones.

---

## Hallazgos importantes

### 6. Falta idempotencia en los asientos de venta
La compra de vehículo verifica duplicados, pero `facturacion._registrarAsientoVenta` y `productos._registrarAsientoRepuestos` **no** llaman `existeAsientoPorReferencia`. Un reintento o doble facturación duplica ingreso + IVA + costo.

Recomendación: mismo guard de idempotencia antes de postear ventas.

### 7. Atomicidad: subledger y mayor pueden divergir
El guardado de la entidad (activo, gasto, vehículo) y el posteo del asiento son operaciones separadas, sin transacción. Peor aún, en `activos-fijos` los `try { … } catch {}` **silencian el fallo contable** ("no bloquear el alta"): el activo queda en su subledger pero **sin asiento en el mayor**, sin log ni alerta.

Recomendación: envolver entidad + asiento en una transacción de base de datos, o al menos registrar el fallo y marcar el registro como "pendiente de contabilizar" para reconciliación. Nunca un `catch` vacío en contabilidad.

### 8. Los asientos se borran físicamente (rompe inmutabilidad)
`eliminarAsientosPorReferencia` hace `delete` físico de asientos y líneas. La buena práctica contable es que un asiento posteado **no se borra**: se anula con un asiento de reversa. El borrado físico destruye la pista de auditoría.

Recomendación: sustituir el borrado por asientos de reversa (mismo importe, débito/crédito invertidos, tipo `Ajuste`/`Cierre`, con referencia al original). Considerar un folio consecutivo e inmutable por asiento.

### 9. Gasto siempre acredita Caja
`gastos._registrarAsiento` siempre acredita 1100 (Caja), sin importar el método real (banco, transferencia, crédito). Sobrevalúa la salida de caja y no permite gastos a crédito (que deberían ir a 2100 CxP).

Recomendación: elegir la contrapartida según método de pago, con opción CxP para gasto a crédito.

### 10. Depreciación de vehículos demo ignora el valor residual
`activos-fijos.depreciarActivos` usa `base = costo − valor_residual` (correcto), pero `vehicles.depreciarVehiculosDemo` deprecia sobre el **costo total** hasta `acum >= costo`, sin residual. Inconsistencia entre los dos motores de depreciación; un vehículo demo se deprecia a cero, lo cual suele ser irreal.

Recomendación: unificar la fórmula y contemplar valor residual también para demos.

---

## Hallazgos menores

**11. Dinero como `float`.** Las columnas son `decimal(14,2)` (bien), pero los cálculos usan `Number()` y sumas en punto flotante con tolerancia 0.01. Para montos grandes o muchas líneas hay riesgo de redondeo. Considerar aritmética en céntimos (enteros) o una librería decimal, y redondear consistentemente cada línea.

**12. Tolerancia de "equilibrado" de ₡1.** En `getBalance`, `equilibrado` usa `< 1`. Un descuadre real menor a un colón quedaría oculto. Endurecer a 0.01 y, con enteros, exigir exactamente 0.

**13. Baja de activo solo por descarte.** `darDeBaja` registra pérdida (5700) por el valor en libros, pero no contempla **venta** del activo (efectivo recibido, y ganancia/pérdida según proceds vs. valor neto). Si se venden activos fijos, falta esa ruta.

**14. `getAsientos` sin fechas devuelve solo "hoy".** Comportamiento defendible, pero conviene documentarlo para no confundir un libro diario "vacío".

---

## Prioridad sugerida

1. Bloqueo de período cerrado (crítico 1) y asiento de cierre real (crítico 2).
2. Reversas consistentes en anulaciones + reemplazar borrado físico por reversa (críticos 3 y 8).
3. Asientos de cobro CxC / pago CxP (crítico 4).
4. Cargas patronales y provisiones de planilla (crítico 5).
5. Idempotencia en ventas y transaccionalidad subledger↔mayor (importantes 6 y 7).
6. Contrapartida de gasto por método de pago, unificar depreciación, dinero en enteros (9, 10, 11).

Ninguno exige rehacer el modelo de datos: son ampliaciones sobre la base ya construida, que es correcta.
