# Revisión final del flujo contable + comparación con Alegra

Segunda auditoría tras tus cambios. Fecha: 2026-07-13.

---

## Veredicto en una línea

El **motor contable (el libro mayor) quedó excelente**: implementaste casi todas las mejores prácticas que faltaban y el ciclo de asientos ya es sólido, cuadrado y auditable. Lo que **todavía no está listo para operar como empresa formal en Costa Rica no es la contabilidad, sino la capa legal**: la facturación electrónica sigue en modo simulado, y ahí es donde Alegra te lleva ventaja. Separá los dos planos: el cálculo contable está muy bien; el cumplimiento ante Hacienda es el que falta cerrar.

---

## Lo que resolviste desde la última revisión (muy bien)

Prácticamente todos los hallazgos críticos e importantes anteriores están corregidos:

- **Bloqueo de período cerrado.** `periodoQueBloquea` + `crearAsiento` rechazan asientos en meses/años cerrados (con `forzar` para ajustes de Admin). ✔
- **Asiento de cierre real.** `cerrarPeriodo` sailda Ingresos/Gastos → 3300 en el mes y traslada 3300 → 3200 en el cierre anual. ✔
- **Reversas en vez de borrado físico.** `reversarAsientosPorReferencia` postea el asiento contrario y es idempotente; `eliminarAsientos...` quedó deprecado apuntando a la reversa. Preserva la pista de auditoría. ✔
- **Dinero en céntimos.** `money.util` (toCents/fromCents/roundMoney); la partida doble cuadra exacto sin tolerancia de float, y el balance usa igualdad exacta. ✔
- **Transaccionalidad.** `crearAsiento` acepta `EntityManager`, así que entidad + asiento pueden ir en una sola transacción. ✔
- **CxC y CxP ya contabilizan.** Cobro: Debe Caja/Banco / Haber 1200. Pago: Debe 2100 / Haber Caja/Banco. ✔
- **Anulaciones y ediciones revierten.** `productos.anularOrden`, `gastos.update/remove` reversan (y re-postean). ✔
- **Compras postea inventario + IVA + CxP** con idempotencia. ✔
- **Planilla reconoce cargas patronales y provisiones**, no solo el bruto. ✔
- **Doble libro de depreciación.** Activos fijos y vehículos demo llevan carril financiero (vida editable) y carril fiscal separado (Anexo 2, 120 meses para vehículos), sin contaminar el mayor. ✔
- **Módulo de IVA completo:** consolidación por tarifa, prorrata, notas de crédito/débito, saldo a favor, retenciones, asiento de liquidación, estados (Pendiente/Generada/Presentada/Pagada), recordatorio automático días 1–15, y borrador XML D-150. ✔

Este nivel de cobertura del ciclo contable es notable para un sistema hecho a medida.

---

## Hallazgos que quedan en el motor contable

### 1. Bug en el asiento de liquidación de IVA (concreto)
En `iva.service.ts → generar()`, el "plug" que balancea el asiento usa `plug = debito − bruto`, pero debería ser `plug = debito − aplicable` (es decir, `debito − bruto + noAplicable`).

Con prorrata = 100% no pasa nada, pero **cuando hay ventas exentas (EVs) y por tanto crédito no deducible, el asiento queda descuadrado por el monto de `noAplicable`**, `crearAsiento` lanza excepción, el `.catch` la traga y la liquidación se guarda **sin asiento contable**. Justo el escenario de electromovilidad que sí te aplica.

Corrección: `const plug = +(debito - aplicable).toFixed(2);` (mantené el débito a 5700 por `noAplicable`). Con eso Débitos = `debito + noAplicable` y Créditos = `bruto + plug` cuadran.

### 2. Vida útil fiscal de "Herramientas" y "Equipo de comunicación"
En la tabla de depreciación pusiste financiera 36/60 meses pero fiscal 120 con tasa 10%. Está bien como doble libro, solo verificá contra el Anexo 2 que esos bienes individualizados no tengan una tasa distinta (herramientas suele ir a 25%/4 años en la tabla). Si aplica, el carril fiscal quedaría corto.

### 3. `catch` que silencian fallos contables
Persisten varios `.catch(() => {})` / `catch {}` alrededor de asientos (activos-fijos, IVA). No bloquean la operación, pero un fallo de contabilización pasa inadvertido. Recomendación: registrar en log + marcar el documento como "pendiente de contabilizar" para reconciliar, en vez de tragar el error.

### 4. `getAsientos` sin fechas devuelve solo "hoy"
Documentado en el código, pero conviene un default de "mes actual" para que el libro diario no aparezca vacío por error de uso.

### 5. Faltan estados financieros formales
`getBalance` y `resumenPeriodo` dan los saldos, pero no hay **Estado de Resultados, Balance General ni Flujo de Caja** como reportes formales exportables (PDF/Excel) con comparativo período a período. Es lo que un contador espera entregar.

---

## Cobertura vs. el ciclo contable completo de una empresa

| Proceso | Estado |
|---|---|
| Plan de cuentas | ✅ Completo y sembrado |
| Libro diario / partida doble | ✅ Sólido, cuadre exacto |
| Asientos automáticos (ventas, compras, gastos, planilla, activos) | ✅ Amplio |
| CxC / CxP | ✅ Registro y liquidación contable |
| Inventario perpetuo + costeo | ✅ Landed cost por VIN |
| Activos fijos + depreciación (doble libro) | ✅ Financiero + fiscal |
| IVA mensual (D-150) | ✅ Con bug menor (punto 1) |
| Cierre mensual/anual con bloqueo | ✅ |
| Planilla + cargas sociales | ✅ |
| **Facturación electrónica Hacienda v4.4** | ⚠️ **Simulada** (ver Alegra) |
| **Conciliación bancaria** | ⚠️ Parcial (hay movimientos, no matching) |
| **Multimoneda CRC/USD + diferencial cambiario** | ⚠️ Importás en USD pero el mayor es solo CRC |
| **Estados financieros formales exportables** | ⚠️ Faltan |
| Renta (D-101) | ❌ No hay declaración de renta |

El **ciclo contable interno está completo**; lo amarillo/rojo es la capa tributaria-legal externa.

---

## Comparación con Alegra y qué te falta

Alegra es un ERP contable genérico muy fuerte en el cumplimiento costarricense. Tu sistema le gana en lo específico del negocio de vehículos (inventario por VIN, costeo de importación, demos, exoneración EV, tracking), pero Alegra trae de fábrica cosas que a vos te faltan y que son **obligatorias o muy valiosas**:

| Función que Alegra da de fábrica | Tu sistema | Prioridad |
|---|---|---|
| **Factura electrónica v4.4 real**: firma XAdES con certificado P12, clave de 50 dígitos y consecutivo válidos, envío al API de recepción de Hacienda, aceptación/rechazo, contingencia | **Simulado** (namespace v4.3, clave `506...`, firma `--SIMULACION--`) | 🔴 Crítico (legal) |
| **Códigos CABYS** por línea (catálogo obligatorio) | No existe | 🔴 Crítico |
| **Recibo Electrónico de Pago (REP)** v4.4 | No | 🔴 Alto |
| **Conciliación bancaria** (importar estado de cuenta y casar movimientos) | Movimientos sí, matching no | 🟠 Alto |
| **Multimoneda con diferencial cambiario** automático | Mayor solo en CRC | 🟠 Alto (importás en USD) |
| **Estados financieros** exportables y comparativos | Saldos sí, reportes formales no | 🟠 Medio |
| Emisión desde móvil, SINPE Móvil, integraciones (Shopify), IA de clasificación | No | 🟢 Opcional |

Nota: durante la transición a TRIBU-CR hay ambigüedad de nombres de formularios (algunas fuentes llaman D-104 al IVA y D-150 a otro). Confirmá el número exacto directamente en TRIBU-CR antes de rotularlo en producción; lo que importa es que la estructura por tarifa ya la tenés bien.

---

## Recomendación

No reemplaces tu sistema por Alegra: tu motor contable ya está a nivel profesional y está hecho a la medida del negocio, cosa que Alegra no hace. La decisión real es **cómo cerrás la facturación electrónica legal**, y tenés dos caminos:

1. **Construirla en serio in-house**: firma XAdES-BES con el P12, generación real de clave/consecutivo, CABYS, envío y polling al API de Hacienda, contingencia y REP. Es trabajo considerable y sensible (criptografía + cumplimiento).
2. **Integrar un proveedor/PAC o la API de Alegra solo para la emisión**, y que tu sistema siga siendo el cerebro contable/operativo. Menos riesgo, más rápido a producción.

Prioridad sugerida: (1) arreglar el bug del plug de IVA —es de una línea—, (2) definir la vía de facturación electrónica real + CABYS, (3) conciliación bancaria y multimoneda con diferencial cambiario, (4) estados financieros formales exportables. Con eso el sistema queda listo para operar como empresa formal de punta a punta.
