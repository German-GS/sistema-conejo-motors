# Prompt de implementación — Facturación electrónica (sin llaves), fix de IVA y pendientes

> Pegá este prompt a tu agente de código (Claude Code / Cursor) sobre el repo `sistema-conejo-motors`. Está pensado para ejecutarse **tarea por tarea**, en orden. Todo lo aquí descrito se puede implementar **sin el certificado `.p12` ni conexión con Hacienda**: la firma y el envío quedan detrás de interfaces con implementación simulada (NoOp) para enchufar las llaves después sin tocar el resto.

---

## Contexto del proyecto

Backend **NestJS + TypeORM** (`backend/src`). El motor contable ya está implementado y es sólido: partida doble en céntimos (`contabilidad/money.util.ts`), bloqueo de período cerrado (`periodoQueBloquea`), asientos de cierre, reversas (`reversarAsientosPorReferencia`), IVA D-150 (`iva/`), doble libro de depreciación, CxC/CxP contabilizando. **No rompas nada de eso.** Todo asiento nuevo debe pasar por `ContabilidadService.crearAsiento` (respeta el bloqueo de período y la partida doble).

Reglas transversales para todas las tareas:
- Mantené la partida doble (débitos = créditos en céntimos).
- No tragues errores con `catch {}` vacío: registrá en log y, si aplica, marcá el documento como pendiente.
- Agregá pruebas unitarias para cada cálculo nuevo (clave, consecutivo, prorrata, estados financieros).
- Si agregás columnas a entidades, incluí la migración TypeORM correspondiente.

---

## TAREA 1 — Fix del bug en la liquidación de IVA (rápido, hacelo primero)

**Archivo:** `backend/src/iva/iva.service.ts`, método `generar()` (≈ línea 230).

**Problema:** el "plug" que balancea el asiento de liquidación usa `debito − bruto`. Cuando hay crédito no deducible por prorrata (ventas exentas de EV), el asiento queda descuadrado por `noAplicable`, `crearAsiento` lanza excepción, el `.catch` la traga y la liquidación se guarda **sin asiento contable**.

**Corrección:** el plug debe ser `debito − aplicable` (equivalente a `debito − bruto + noAplicable`).

```ts
// ANTES
const plug = +(debito - bruto).toFixed(2);
// DESPUÉS
const plug = +(debito - aplicable).toFixed(2);
```

**Criterio de aceptación:** con una prorrata < 100% (mezcla de ventas gravadas y exentas), `generar()` produce un asiento que **cuadra** (Débitos: `2200 debito` + `5700 noAplicable`; Créditos: `1210 bruto` + `2210 plug`) y la liquidación queda con `asiento_id` no nulo. Agregá un test con débito=100, crédito bruto=80, prorrata=50% → noAplicable=40, aplicable=40, plug=60, y verificá el cuadre.

---

## TAREA 2 — Facturación electrónica v4.4 en modo interino (sin llaves)

Objetivo: dejar **todo el pipeline real menos firma y envío**, que quedan simulados detrás de interfaces. Un comprobante fluye por estados y se detiene en `Borrador` hasta que existan las llaves.

### 2.1 Actualizar a la estructura v4.4
**Archivo:** `backend/src/facturacion/xml-generator.service.ts`.
- Cambiar el namespace de `.../v4.3/facturaElectronica` a la versión **v4.4** vigente (`https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica`). Confirmá el URI exacto contra el Anexo de estructuras v4.4 de Hacienda.
- Ajustar el árbol del XML al esquema v4.4 (incluye `CodigoActividadEmisor`/`CodigoActividadReceptor`, `Receptor`, `DetalleServicio/LineaDetalle`, `ResumenFactura` con impuestos por línea, `MedioPago`, etc.).

### 2.2 Generar la clave numérica REAL (50 dígitos) — no requiere llaves
Reemplazar el `generarClaveYConsecutivo()` simulado (`clave = '506...'`) por el algoritmo oficial:

```
clave (50) = 506               (3, país CR)
           + DDMMAA            (6, fecha de emisión)
           + cédula emisor     (12, con ceros a la izquierda)
           + consecutivo       (20, ver 2.3)
           + situación         (1: 1 normal / 2 contingencia / 3 sin internet)
           + código seguridad  (8, aleatorio)
```

Confirmá el orden/longitudes contra el Anexo oficial. Persistir `codigo_seguridad` y `situacion` en `factura.entity`.

### 2.3 Generar el consecutivo REAL (20 dígitos) — no requiere llaves
```
consecutivo (20) = casa comercial (3) + terminal (5) + tipo comprobante (2) + secuencial (10)
```
Tipo de comprobante: `01` factura electrónica, `02` nota de débito, `03` nota de crédito, `04` tiquete, etc. Manejá el secuencial por (sucursal, terminal, tipo) de forma atómica (columna contador o `SELECT ... FOR UPDATE`).

**IMPORTANTE — no quemar consecutivos en el interino:** mientras no haya firma/envío, **no asignes el consecutivo definitivo**. Generá el documento como `Borrador` con consecutivo provisional (o sin consecutivo), y asigná el consecutivo/clave definitivos **solo en el momento de firmar+enviar de verdad** (Tarea 2.5). Esto evita huecos y duplicados en la numeración cuando entres a producción.

### 2.4 CABYS por línea (catálogo público, sin llaves)
- Crear entidad `Cabys` (código, descripción, tarifa IVA sugerida) y un cargador del catálogo (descargable de BCCR/Hacienda).
- Agregar `cabys` como campo obligatorio en la línea de factura/cotización/producto.
- Validar el código contra el catálogo al crear la línea; sugerir la tarifa de IVA por CABYS.

### 2.5 Interfaces de firma y envío (implementación NoOp ahora)
Definí dos interfaces y sus implementaciones simuladas actuales; la real se implementa cuando llegue el `.p12`:

```ts
export interface Firmador {
  firmar(xmlSinFirma: string): Promise<string>; // XAdES-BES en prod; NoOp ahora
}
export interface HaciendaClient {
  enviar(claveNumerica: string, xmlFirmado: string): Promise<{ estado: 'Enviada' }>;
  consultarEstado(claveNumerica: string): Promise<{ estado: 'Aceptada' | 'Rechazada' | 'Procesando'; xmlRespuesta?: string }>;
}
```
- `FirmadorNoop`: devuelve el XML marcado como borrador (lo que hoy hace `crypto.service`), sin firmar.
- `HaciendaClientNoop`: no hace ninguna llamada de red; deja el documento en `Borrador`.
- Registrar la implementación por token/factory para intercambiarla luego por la real sin tocar `facturacion.service`.

### 2.6 Máquina de estados del comprobante
En `factura.entity` (`FacturaStatus`): `Borrador → Firmada → Enviada → Aceptada | Rechazada`. En modo interino el flujo se detiene en `Borrador`. Guardar `xml_enviado` (aquí, XML sin firmar del borrador) y `xml_respuesta` (vacío por ahora).

### 2.7 Marcado legal
Todo comprobante en `Borrador`/sin firmar debe:
- Persistir un flag `valido_fiscalmente = false`.
- Mostrar en cualquier PDF/representación gráfica la leyenda **"BORRADOR — no válido para efectos tributarios"**.
- No entregarse al cliente como factura legal ni usarse para respaldar IVA.

**Criterio de aceptación de la Tarea 2:** se puede crear una venta y generar su comprobante v4.4 con clave y estructura reales, CABYS por línea, guardado como `Borrador`, sin ninguna llamada de red ni uso de certificado. Cambiar a producción = implementar `Firmador`/`HaciendaClient` reales + cargar el `.p12` + credenciales, sin modificar el resto del pipeline. Documentar en el README que producción debe empezar por el **ambiente de pruebas (sandbox)** de Hacienda.

---

## TAREA 3 — Pendientes contables sin llaves

### 3.1 Eliminar los `catch` que silencian fallos contables
En `activos-fijos/`, `iva/` y donde haya `catch {}` / `.catch(() => {})` alrededor de `crearAsiento`: registrar el error en log y marcar el documento origen con `pendiente_contabilizar = true` (columna nueva) para reconciliación posterior. Exponer un endpoint que liste documentos pendientes de contabilizar.

### 3.2 `getAsientos` sin fechas → mes actual (no solo hoy)
**Archivo:** `contabilidad/contabilidad.service.ts`, `getAsientos()`. Cambiar el default para que, si no vienen fechas, devuelva del primer día del mes actual a hoy (en `America/Costa_Rica`), no solo el día de hoy.

### 3.3 Estados financieros formales exportables
En `reports/`: agregar **Estado de Resultados**, **Balance General** y **Flujo de Caja** por período, con comparativo período-a-período, reutilizando `ContabilidadService.getBalance`/`resumenPeriodo`. Exportables a Excel/PDF (ya existe `generarExcelCierre` como referencia de estilo).

### 3.4 Verificar tasas fiscales del Anexo 2
En `depreciacion/depreciacion.service.ts` (`DEFAULTS`/`FISCAL_POR_NOMBRE`): confirmar contra el Anexo Nº 2 la tasa fiscal de **Herramientas** y **Equipo de comunicación** (algunas herramientas van a 25%/4 años, no 10%/10). Ajustar `vida_util_fiscal_meses`/`tasa_anual` si corresponde.

---

## Orden de ejecución sugerido
1. Tarea 1 (fix IVA — una línea + test).
2. Tarea 3.2 y 3.1 (rápidas, bajo riesgo).
3. Tarea 2 completa (facturación interina).
4. Tarea 3.3 (estados financieros).
5. Tarea 3.4 (verificación fiscal).

## Fuera de alcance (requiere llaves o es mayor)
- Firma XAdES-BES real, token OAuth y POST al API de recepción de Hacienda (se enchufan en las interfaces de la Tarea 2.5 cuando exista el `.p12`).
- Multimoneda CRC/USD con diferencial cambiario automático y conciliación bancaria con matching: planificar como fase aparte.
