# Diseño: depreciación de doble libro (financiera + fiscal)

Análisis de diseño para llevar depreciación **financiera (NIIF)** y **fiscal (Anexo Nº 2, Decreto 43198-H)** en paralelo. No incluye código; es la guía conceptual y de modelo de datos.

---

## Principio base: son dos cálculos, un solo libro contable

La clave conceptual: **solo la depreciación financiera se contabiliza en el mayor** (es la que aparece en tus estados financieros, cuenta 5450 / contra-activo). La depreciación fiscal **no genera asientos**; vive en un subledger tributario aparte y solo alimenta la declaración de renta (D-101) y el cálculo de impuesto diferido.

Si posteás las dos al mayor, descuadrás la contabilidad. La fiscal es un cálculo paralelo, no un asiento.

```
Costo del activo
   │
   ├── Libro FINANCIERO (NIIF) ──► asiento contable ──► Estados financieros
   │      vida útil real, con valor residual
   │
   └── Libro FISCAL (Anexo 2) ──► subledger tributario ──► Declaración renta
          vida útil de Hacienda, sobre costo total (sin residual)
                    │
                    └── diferencia (financiera − fiscal) ──► impuesto diferido
```

---

## Mapa de vidas útiles fiscales para tus categorías

Tomado del Anexo Nº 2 para los bienes que aplican a Conejo Motors:

| Tu `CategoriaActivo` | Bien en Anexo 2 | % línea recta | Vida útil | Meses fiscales |
|---|---|---|---|---|
| Vehículo Demo (automóvil) | Automóviles (uso en empresas) | 10% | 10 años | **120** |
| Equipo de Cómputo | Equipo de computación | 20% | 5 años | **60** |
| Mobiliario | Equipo de oficina y mobiliario | 10% | 10 años | **120** |
| Equipo de Taller (maquinaria) | Maquinaria / equipo (10% típico) | 10% | 10 años | **120** |
| Edificio / Instalaciones | Edificios de cemento, ladrillo, metal | 2% | 50 años | **600** |
| Otro | — | (según bien individual) | — | definir por caso |

Referencias adicionales por si las usás: Autobuses 15%/7 años; Camiones de carga 20%/5 años; Aire acondicionado 10%/10 años; Cajas registradoras 10%/10 años; Edificios de madera 1ª 4%/25 años.

Regla del Anexo (norma 2ª): si un bien aparece **individualizado** en la tabla, usás su porcentaje aunque también pudiera caer en un grupo. Por eso conviene, además de la categoría, permitir fijar la vida útil fiscal manualmente por activo.

---

## Correcciones que revela la tabla sobre el código actual

**1. `VIDA_UTIL_MESES_DEMO = 60` está mal fiscalmente.** Un automóvil de empresa es 10 años (120 meses), no 5. Con 60 estás depreciando al doble de la tasa que permite Hacienda. Financieramente 5 años puede defenderse para un demo intensivo, pero para renta son 120 meses. Justo por esto necesitás los dos libros.

**2. El default genérico de 60 meses solo calza con equipo de cómputo.** Mobiliario, taller y edificios quedan muy por debajo de su vida fiscal.

**3. Tu libro financiero resta valor residual (`base = costo − residual`); el fiscal no.** Hacienda deprecia sobre el costo total. Esta es la principal fuente de diferencia libro-fiscal, junto con las distintas vidas útiles.

---

## Cambios de modelo de datos (entidad `ActivoFijo`)

Mantené los campos financieros actuales y agregá el bloque fiscal:

Financieros (ya existen): `costo`, `valor_residual`, `vida_util_meses`, `depreciacion_acumulada`, `ultimo_periodo_depreciado`.

Fiscales (nuevos):
- `vida_util_fiscal_meses` — de la tabla según categoría; editable por activo.
- `metodo_fiscal` — `'LineaRecta' | 'SumaDigitos'` (los dos que permite el Anexo).
- `depreciacion_fiscal_acumulada` — separada de la financiera.
- `ultimo_periodo_fiscal` — control de idempotencia del cálculo fiscal.
- `porcentaje_fiscal` — opcional, para reportar el % del Anexo.

Campos del "libro de activos depreciables" que exige el Reglamento (punto 1.1) y hoy te faltan:
- `numero_inventario` y `localizacion` del bien.
- `metodo_depreciacion` (financiero) explícito.
- Observaciones (tu `notas` sirve).

---

## Flujo por período

**Depreciación financiera (mensual, como hoy):**
Debe 5450 Gasto por Depreciación / Haber 1525·1590 Dep. Acumulada. Base = costo − residual, sobre `vida_util_meses`. Esto va al mayor y a los estados financieros. Sin cambios de fondo respecto a tu cron actual.

**Depreciación fiscal (cálculo paralelo, sin asiento):**
Base = costo total (sin residual), sobre `vida_util_fiscal_meses`, método línea recta o suma de dígitos. Se guarda en `depreciacion_fiscal_acumulada`. Solo se usa para el reporte de renta.

**Prorrateo primer/último mes (obligatorio fiscal, punto 1.7):** la primera cuota se calcula en proporción a los meses de uso dentro del período. Tu cron aplica cuota completa el primer mes; para el cálculo fiscal hay que prorratear por la fecha de adquisición.

---

## Diferencia libro-fiscal e impuesto diferido

Cada período, `depreciación financiera − depreciación fiscal` es una **diferencia temporaria**. Ejemplo con un demo de ₡10.000.000:

- Financiero (5 años): ₡2.000.000/año.
- Fiscal (10 años): ₡1.000.000/año.
- Diferencia: ₡1.000.000/año → el gasto contable es mayor que el deducible.

Esa diferencia genera un **activo por impuesto diferido** (a la tasa de renta vigente). NIIF exige reconocerlo; para efectos prácticos podés al menos reportar la diferencia acumulada para que el contador arme el ajuste. Este es el motivo real por el que se llevan dos libros: reconciliar utilidad contable con renta gravable.

---

## Otros dos puntos del Reglamento que conviene incorporar

**Gasto directo si el costo ≤ 25% de un salario base (punto 1.1).** Un activo cuyo costo unitario no supere ese umbral puede llevarse directo a gasto en vez de capitalizarse. Podrías auto-sugerir "gastar" vs "capitalizar" al crear el activo. (Decime si querés que te consiga el valor del salario base 2026 vigente para fijar el umbral.)

**Diferencias cambiarias en importación (punto 1.2).** Las que surgen en el período de compra se cargan al costo del activo; las de períodos siguientes son gasto/ingreso. Relevante porque importás las unidades.

---

## Resumen de la decisión

Vas por doble libro, que es lo correcto si el sistema debe servir tanto para estados financieros como para la declaración de renta. El trabajo concreto es: (1) agregar el bloque fiscal a la entidad, (2) tabla de vidas útiles del Anexo 2 mapeada por categoría con override manual, (3) un cálculo fiscal paralelo que NO postea al mayor, (4) prorrateo de primer/último mes en el fiscal, y (5) un reporte de diferencia libro-fiscal para el impuesto diferido. La depreciación financiera actual se mantiene casi igual; lo nuevo es el carril fiscal en paralelo.
