# Diseño: cálculo mensual de IVA y mapeo a TRIBU-CR (D-150)

Análisis de diseño para que el sistema calcule automáticamente el IVA de Costa Rica cada mes y produzca exactamente los datos que hay que digitar en la declaración de TRIBU-CR. No incluye código; es la guía conceptual, el modelo de datos y el mapeo de casillas.

---

## Primero: lo que cambió en TRIBU-CR (importante)

TRIBU-CR entró en operación el **6 de octubre de 2025** y reemplazó al ATV. Dos cambios que afectan el diseño:

1. **El formulario ya no es el D-104; ahora es el D-150.** (Algunas guías todavía lo llaman D-104 por costumbre, pero en TRIBU-CR el formulario de IVA es el D-150.)
2. **Se declara por tarifa, no por actividad económica.** Antes segregabas ventas por actividad; ahora todo se agrupa por tarifa de IVA: **13%, 4%, 2%, 1%, 0,5%, exento y no sujeto**.
3. **Prellenado automático** desde los comprobantes electrónicos v4.4 (facturas emitidas y recibidas). Tu declaración llega precargada; tu trabajo es **verificar** contra tu contabilidad. Por eso el sistema debe producir los mismos totales que Hacienda precarga, para conciliar.

Plazo: **primeros 15 días naturales del mes siguiente**. Aunque no haya ventas, hay que declarar en cero (omitirla = multa de medio salario base).

---

## El cálculo, en una línea

```
IVA a pagar del mes = Débito fiscal (IVA de ventas)
                    − Crédito fiscal (IVA de compras/gastos, ajustado por proporcionalidad)
                    − Retenciones de IVA soportadas (tarjeta/otros)
```

Tu contabilidad ya tiene las dos piezas centrales:
- **Débito fiscal** → cuenta **2200 Impuestos por Pagar (IVA)** (crédito en cada venta).
- **Crédito fiscal** → cuenta **1210 IVA Acreditable** (débito en cada compra/importación).

Es decir, el IVA del mes ya está "latente" en los movimientos de 2200 y 1210. El módulo lo que hace es **resumirlo por tarifa** y dejarlo listo para la D-150.

---

## Qué datos ya tenés y qué te falta

**Ya capturado:**
- `cotizacion.iva_porcentaje` (13 por defecto), `iva_monto`, `precio_final` (base imponible).
- `venta.monto_final`, `venta.iva_monto`, `total_con_iva`.
- `vehicle.iva_importacion` → crédito fiscal, va a 1210. ✔ Correcto.
- `orden_compra.iva` (compras) y productos (IVA extraído del total).

**Vacíos que rompen el cálculo del IVA:**

1. **Los gastos NO capturan IVA.** `Gasto` solo tiene `monto`; no hay campo de IVA. Todo el crédito fiscal de gastos locales (combustible, papelería, servicios con IVA) **se pierde**. Necesitás desglosar base + IVA en cada gasto.
2. **`orden_compra.iva` no se contabiliza en 1210.** El módulo de compras no postea a contabilidad (solo el vehículo lleva su IVA de importación). Ese crédito fiscal no entra al libro.
3. **Solo existe la tarifa 13%.** No hay soporte para tarifas diferenciadas (4/2/1/0,5), exento ni no sujeto. Para la D-150, que se ordena por tarifa, necesitás una **tarifa por línea**.
4. **Exoneración de vehículos eléctricos (Ley 9518) no está modelada.** Si vendés EVs (tenés `ElectromovilidadSection`), parte de esas ventas puede ir exenta o a base reducida según los topes de la ley. Eso cambia el débito fiscal y obliga a **proporcionalidad**.
5. **Proporcionalidad (prorrata) no existe.** Si tenés ventas exentas (EVs), el crédito fiscal no es 100% deducible: se prorratea según la proporción de ventas gravadas. TRIBU-CR pide el porcentaje de prorrata.
6. **Retenciones de IVA (datáfono/tarjeta) no se registran.** Los procesadores de tarjeta retienen un % del IVA; en la D-150 se restan del impuesto a pagar. Hoy no se capturan.

---

## Modelo de datos propuesto

**A) Tarifa a nivel de línea (ventas y compras).**
Agregar a `cotizacion`/`venta` y a las líneas de productos/taller un campo:
- `iva_tarifa` — enum `'T13' | 'T04' | 'T02' | 'T01' | 'T005' | 'Exento' | 'NoSujeto'`.
- `iva_condicion` — para exoneraciones: `'Gravado' | 'Exonerado' | 'Exento'` + `numero_exoneracion` (autorización de Hacienda para EVs).

**B) Desglose de IVA en gastos y compras.**
Agregar a `Gasto` (y usar el `iva` que ya existe en `orden_compra`):
- `base_imponible`, `iva_monto`, `iva_tarifa`.
- `tipo_credito` — `'Bienes' | 'Servicios' | 'BienesCapital'` (la D-150/TRIBU-CR clasifica el crédito así; un error común es clasificarlo mal).

**C) Entidad nueva `LiquidacionIVA` (una por mes).**
Snapshot del período, análogo a tu `CierreDiario` pero para IVA:
```
periodo (YYYY-MM, único)
ventas_por_tarifa      { T13:{base,iva}, T04:{...}, ..., Exento:{base}, NoSujeto:{base} }
compras_por_tarifa     { ... }  // crédito fiscal
debito_fiscal          // Σ IVA de ventas
credito_fiscal_bruto   // Σ IVA de compras
porcentaje_prorrata    // ventas gravadas / ventas totales
credito_fiscal_aplicable // credito_bruto × prorrata
retenciones_iva
iva_a_pagar            // debito − credito_aplicable − retenciones
saldo_a_favor_anterior
total_a_pagar
cerrado (bool)
generado_por
```

---

## Mapeo a las casillas de la D-150

| Sección D-150 (TRIBU-CR) | Origen en tu sistema |
|---|---|
| **Ventas gravadas 13%** (base e impuesto) | Ventas del mes con `iva_tarifa=T13`: base = Σ `precio_final`; impuesto = Σ `iva_monto` |
| Ventas 4% / 2% / 1% / 0,5% | Mismo, filtrado por tarifa (para autos casi todo es 13%) |
| **Ventas exentas** | Ventas EV exoneradas / bienes exentos: Σ base, sin impuesto |
| **Ventas no sujetas** | Operaciones fuera del ámbito del IVA (ej. traspaso de activos, indemnizaciones) |
| **Total débito fiscal** | Σ impuesto de todas las tarifas = movimientos crédito de la cuenta 2200 del mes |
| **Compras/crédito 13%…0,5%** | Compras y gastos con IVA por tarifa: `orden_compra.iva`, `gasto.iva_monto`, `vehicle.iva_importacion` = movimientos débito de 1210 |
| **Clasificación del crédito** (bienes/servicios/bienes de capital) | Campo `tipo_credito` |
| **Proporcionalidad (%)** | `porcentaje_prorrata` = ventas gravadas ÷ ventas totales |
| **Crédito fiscal aplicable** | `credito_fiscal_bruto × prorrata` |
| **Retenciones soportadas** | `retenciones_iva` (datáfono) |
| **Impuesto a pagar / saldo a favor** | `debito − credito_aplicable − retenciones` |

---

## Flujo mensual (automático)

1. **Cron el día 1 de cada mes** (o generación bajo demanda) que consolida el mes anterior:
   - Recorre asientos del período por cuenta 2200 (débito fiscal) y 1210 (crédito fiscal), agrupando por `iva_tarifa`.
   - Calcula prorrata, crédito aplicable, retenciones e IVA a pagar.
   - Guarda el snapshot en `LiquidacionIVA`.
2. **Asiento de liquidación de IVA** (cierre del período fiscal del impuesto). Al liquidar, se netea el crédito contra el débito y queda el pasivo líquido a pagar:
   ```
   Debe  2200  Impuestos por Pagar (IVA)   = débito fiscal del mes
   Haber 1210  IVA Acreditable             = crédito fiscal aplicable
   Haber 2200-L IVA por pagar (líquido)     = diferencia a enterar a Hacienda
   ```
   (El crédito no aplicable por prorrata se manda a gasto o queda como saldo a favor, según corresponda.)
3. **Reporte D-150**: una vista/exportación con las casillas de arriba, para copiar/verificar contra el prellenado de TRIBU-CR. Idealmente exportable a XML/archivo si a futuro se integra por API, pero de entrada basta con el reporte para digitar/conciliar.
4. **Pago**: se hace en TRIBU-CR (IBAN registrado o banco). El sistema no paga; solo deja la liquidación lista. Al confirmar el pago, un asiento: Debe 2200-L / Haber Banco.

---

## Puntos de cumplimiento a no olvidar

- **Declarar aunque sea en cero.** El módulo debe generar la liquidación incluso sin ventas.
- **Prorrata bien calculada.** Es el error más sancionado (multas del 50% al 150%). Si vendés EVs exentos, esto aplica sí o sí.
- **Conciliar con el prellenado.** TRIBU-CR precarga desde facturación electrónica; tus totales deben cuadrar con esa precarga. Cualquier diferencia hay que documentarla.
- **Retenciones de tarjeta.** Verificar los montos retenidos por el banco al cobrar con datáfono; se acreditan contra el IVA a pagar.
- **Notas de crédito/débito.** Deben ajustar el débito/crédito del mes (devoluciones, descuentos posteriores).

---

## Resumen de lo que hay que construir

El corazón del cálculo ya está en tu contabilidad (2200 y 1210). Lo que falta es: (1) **tarifa por línea** en ventas y desglose de **IVA en gastos/compras** para que ninguna base ni crédito se pierda, (2) modelar **exención EV + proporcionalidad**, (3) una entidad **`LiquidacionIVA`** que consolide el mes por tarifa, (4) el **asiento de liquidación** que netea 1210 contra 2200, y (5) un **reporte D-150** con las casillas por tarifa para conciliar con el prellenado de TRIBU-CR. Con eso el sistema calcula el IVA solo cada mes y te entrega exactamente los datos que pide Hacienda.
