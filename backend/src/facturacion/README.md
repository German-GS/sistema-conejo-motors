# Facturación Electrónica v4.4 (TRIBU-CR) — Modo interino

Este módulo genera comprobantes electrónicos con la **estructura v4.4** de Hacienda Costa
Rica. Hoy corre en **modo interino (sin llaves)**: todo el pipeline es real **menos la firma
y el envío**, que están detrás de interfaces con implementación simulada (NoOp).

## Flujo actual (sin certificado)

```
generar XML v4.4  →  firmar (FirmadorNoop)  →  enviar (HaciendaClientNoop)  →  estado 'Borrador'
```

- **Clave numérica (50)** y **consecutivo (20)**: se generan con el algoritmo oficial
  (`NumeracionService`), pero en modo interino son **PROVISIONALES** — no consumen el
  secuencial oficial, para no dejar huecos en la numeración al pasar a producción.
- Cada comprobante queda con `estado = 'Borrador'`, `valido_fiscalmente = false` y
  `numeracion_provisional = true`.
- El XML lleva la leyenda **"BORRADOR — no válido para efectos tributarios"**. No debe
  entregarse al cliente como factura legal ni usarse para respaldar IVA.

## Máquina de estados

`Borrador → Firmada → Enviada → Aceptada | Rechazada`. En interino el flujo se detiene en
`Borrador`.

## Pasar a producción (cuando exista el `.p12`)

1. Implementar `Firmador` real (firma **XAdES-BES** con el certificado `.p12` + PIN).
2. Implementar `HaciendaClient` real: token OAuth del IDP
   (`idp.comprobanteselectronicos.go.cr`) + `POST` al API de recepción
   (`api.comprobanteselectronicos.go.cr/recepcion`) + consulta de estado.
3. Registrar las nuevas implementaciones en `facturacion.module.ts` reemplazando
   `FirmadorNoop`/`HaciendaClientNoop` en los providers `FIRMADOR` / `HACIENDA_CLIENT`.
   **No hay que tocar `facturacion.service.ts`.**
4. Al firmar+enviar de verdad, consumir el consecutivo definitivo con
   `NumeracionService.generarDefinitivo(...)` (secuencia atómica por sucursal/terminal/tipo).

> ⚠️ **Empezar SIEMPRE por el ambiente de PRUEBAS (sandbox) de Hacienda** antes de producción,
> validando aceptación de comprobantes de prueba.

## CABYS (Tarea 2.4)

Módulo `cabys/` con la entidad `Cabys` (código 13 díg., descripción, tarifa IVA sugerida):

- **Semilla del negocio** al arrancar: vehículos eléctricos (`4911315000000`), híbridos,
  repuestos/accesorios (`4912999009900`), servicios de mantenimiento (`8714100000200`), etc.
  (ver `CABYS_DEFAULTS`). La factura de vehículo usa por defecto el CABYS de vehículo eléctrico.
- **Validación / autocompletar**: `GET /cabys/buscar?q=`, `GET /cabys/:codigo`.
- **Catálogo completo**: `POST /cabys/importar` (Admin) sube el Excel oficial de BCCR/Hacienda
  y hace upsert de las ~20 000 filas (código en col. "Categoría 9", tarifa en "Impuesto").

### Pendiente de CABYS
- Hacer `cabys` un campo editable/obligatorio en las líneas de cotización/producto/orden con
  UI en el frontend (hoy se resuelve por defecto según el tipo de línea).
