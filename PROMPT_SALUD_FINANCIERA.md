# Prompt — Análisis de salud financiera (indicadores con semáforo)

> Pegá este prompt a tu agente de código sobre `sistema-conejo-motors`. No requiere llaves criptográficas ni servicios externos. Diagnóstico **determinista (reglas fijas)**, sin IA.

## Objetivo
Agregar en los informes un **análisis de salud financiera** que calcule los indicadores contables clásicos a partir del Balance General y el Estado de Resultados que ya existen, con **semáforo (verde/amarillo/rojo)**, interpretación por rangos, comparativo contra el mes anterior y un **diagnóstico general**.

## Contexto / reutilización
Ya existen en `reports/estados-financieros.service.ts`: `balanceGeneral(periodo)` (con `activo.totalCorriente`, `pasivo.totalCorriente`, `totales.activos/pasivos/patrimonio`) y `estadoResultados(periodo)` (con `ingresos[]`, `gastos[]`, `totalIngresos`, `totalGastos`, `utilidadNeta`). Y en `contabilidad`: `getBalance(desde,hasta)` y `movimientosPorCuenta(desde,hasta)`. **Reutilizá todo eso**; para saldos puntuales por cuenta (1200, 1300, 1400, 2100, 4100, 5100, etc.) filtrá por `codigo`.

Crear: `reports/salud-financiera.service.ts` + endpoint `GET /reportes/salud-financiera?periodo=YYYY-MM&comparar=true`, y una pestaña **"Salud Financiera"** en la página de Estados Financieros del frontend.

---

## Indicadores a calcular

Cada indicador devuelve: `{ categoria, nombre, formula, valor, unidad, semaforo, interpretacion, referencia, actual, anterior, tendencia }`.
`unidad ∈ {ratio, '%', 'CRC', 'días'}`. `semaforo ∈ {verde, amarillo, rojo, na}`.

### Liquidez
| Indicador | Fórmula | Verde / Amarillo / Rojo |
|---|---|---|
| Razón corriente | Activo corriente / Pasivo corriente | ≥1.5 / 1.0–1.5 / <1.0 |
| Prueba ácida | (Activo corriente − Inventarios) / Pasivo corriente | ≥1.0 / 0.7–1.0 / <0.7 |
| Capital de trabajo | Activo corriente − Pasivo corriente (CRC) | >0 / =0 / <0 |

Inventarios = saldo(1300) + saldo(1400).

### Endeudamiento / Solvencia
| Indicador | Fórmula | Verde / Amarillo / Rojo |
|---|---|---|
| Razón de endeudamiento | Pasivo total / Activo total | <0.40 / 0.40–0.60 / >0.60 |
| Deuda / Patrimonio | Pasivo total / Patrimonio | <1.0 / 1.0–2.0 / >2.0 |
| Solvencia patrimonial | Patrimonio / Activo total | >0.50 / 0.30–0.50 / <0.30 |

Si el patrimonio es ≤ 0 → semáforo rojo con mensaje "patrimonio negativo/nulo".

### Rentabilidad (del período)
| Indicador | Fórmula | Verde / Amarillo / Rojo |
|---|---|---|
| Margen bruto | (Ventas − Costo de ventas) / Ventas | >15% / 5–15% / <5% |
| Margen neto | Utilidad neta / Ventas | >5% / 0–5% / <0 |
| ROA | Utilidad neta / Activo total | >0 (verde), <0 (rojo) |
| ROE | Utilidad neta / Patrimonio | >0 (verde), <0 (rojo) |

Ventas = saldo(4100)+saldo(4200) del período. Costo de ventas = saldo(5100)+saldo(5200). (Los márgenes de autos son delgados; los rangos son referenciales.)

### Actividad / Eficiencia
| Indicador | Fórmula | Nota |
|---|---|---|
| Rotación de inventario | Costo de ventas / Inventario (final) | veces en el período |
| Días de inventario | díasPeríodo / rotación inventario | menos es mejor |
| Rotación de CxC | Ventas / CxC (saldo 1200) | veces |
| Período promedio de cobro | díasPeríodo / rotación CxC | días |
| Rotación de CxP | Costo de ventas / CxP (saldo 2100) | veces |
| Período promedio de pago | díasPeríodo / rotación CxP | días |
| Ciclo de conversión de efectivo | días inventario + días cobro − días pago | menos es mejor |

`díasPeríodo` = días del mes analizado. Para días de inventario/cobro/pago, semáforo por rangos razonables (definir; p. ej. días de inventario para autos: <90 verde, 90–180 amarillo, >180 rojo). Documentá los rangos elegidos.

---

## Reglas de cálculo y casos borde
- **División por cero / datos faltantes** → `valor: null`, `semaforo: 'na'`, `interpretacion: 'Sin datos suficientes (p. ej. aún sin ventas o sin pasivo).'` No romper.
- **Patrimonio o activo ≤ 0** → manejar explícitamente (rojo + mensaje), no producir ratios engañosos.
- **Empresa sin ventas (pre-operativa)** → los indicadores de rentabilidad/actividad quedan `na`; el diagnóstico general debe reconocer la etapa ("empresa en etapa pre-operativa, sin ventas registradas").
- **Anualización**: ROA/ROE se pueden anualizar (×365/díasPeríodo). Si lo hacés, **etiquetarlo claramente**; si no, marcar que es del período.
- Todos los montos desde el motor contable (céntimos); redondear a 2 decimales al presentar.

## Comparativo y tendencia
Calcular cada indicador también para el mes anterior; `tendencia ∈ {mejora, empeora, estable}` según si el cambio es favorable para ese indicador (ojo: en endeudamiento/días, bajar = mejora; en liquidez/márgenes, subir = mejora).

## Diagnóstico general (determinista)
- Puntaje: verde=2, amarillo=1, rojo=0, `na` no cuenta. Promedio → **semáforo global** (p. ej. ≥1.5 verde, 0.8–1.5 amarillo, <0.8 rojo).
- Narrativa por reglas: listar automáticamente las **fortalezas** (indicadores verdes) y los **riesgos** (rojos) en frases fijas, más una línea de contexto según la etapa (pre-operativa / con pérdidas / rentable).
- Devolver `{ semaforoGlobal, puntaje, fortalezas: string[], riesgos: string[], resumen: string }`.

## Frontend
Pestaña "Salud Financiera" (junto a Estado de Resultados / Balance / Flujo) o página nueva:
- Arriba, un **banner de diagnóstico general** con el semáforo global y el resumen (fortalezas/riesgos).
- Debajo, **tarjetas agrupadas por categoría** (Liquidez, Endeudamiento, Rentabilidad, Actividad). Cada tarjeta: nombre, valor formateado (ratio/%/CRC/días), color de fondo según semáforo, flecha de tendencia vs mes anterior, y tooltip con la **fórmula** y la **interpretación**.
- Los `na` se muestran en gris con "—" y su mensaje.
- Nota al pie: "Indicadores informativos; su interpretación debe revisarse con el contador."

## Reglas transversales
- Solo lectura (no postea asientos). Reutiliza `estados-financieros`/`contabilidad`; no dupliques el cálculo de saldos.
- Pruebas unitarias: (a) razón corriente con activo/pasivo conocidos; (b) casos borde (pasivo 0, patrimonio negativo, sin ventas) devuelven `na` sin romper; (c) semáforo global correcto ante una mezcla de verdes/rojos; (d) tendencia favorable/ desfavorable según el tipo de indicador.
- Exportable al Excel de estados financieros como una hoja adicional "Salud Financiera" (opcional pero recomendado).
