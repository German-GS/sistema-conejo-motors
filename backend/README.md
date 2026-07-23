# Backend — Conejo Motors

NestJS + TypeORM (PostgreSQL / Cloud SQL). Desplegado en Google Cloud Run.

## 🔐 Secretos y variables de entorno

**Los secretos viven SOLO en variables de entorno de Cloud Run.** Nunca en el repositorio.

- Los archivos `.env*` están en `.gitignore` (solo se versionan las plantillas `*.example`, sin secretos).
- En **producción**, la configuración real (BD, JWT, emisor, etc.) proviene de las env vars de
  Cloud Run; `process.env` tiene prioridad sobre cualquier `.env`.
- Para **desarrollo local**, copiá `.env.example` → `.env.development` y completá tus valores.

### Variables sensibles (solo en Cloud Run)
| Variable | Qué es |
|---|---|
| `JWT_SECRET` | Firma de los tokens de sesión. Rotarla invalida todas las sesiones (re-login). |
| `DB_PASSWORD` | Contraseña del usuario de Cloud SQL (`conejo_app`). |
| `ADMIN_RESET_SECRET` | Llave maestra del break-glass de recuperación de admin. |
| `GCS_BUCKET` | Bucket privado de comprobantes/documentos. |

### Rotación de secretos (obligatoria si se filtraron)
Purgar el historial de git **no basta**: si alguien clonó con los valores viejos, siguen siendo
válidos hasta rotarlos. Por eso, ante cualquier filtración:

1. **JWT_SECRET** — generar y setear uno nuevo (invalida sesiones; todos re-loguean):
   ```bash
   NEW=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
   gcloud run services update conejo-motors-backend --region us-central1 --update-env-vars JWT_SECRET="$NEW"
   ```
2. **Contraseña de Cloud SQL** — cambiar en la base y en la env var (breve ventana de reconexión):
   ```bash
   gcloud sql users set-password conejo_app --instance=conejo-motors-db --password='NUEVA'
   gcloud run services update conejo-motors-backend --region us-central1 --update-env-vars DB_PASSWORD='NUEVA'
   ```
3. Verificar que los valores viejos ya no funcionen en ningún entorno.

## Facturación electrónica — pasar a producción (las llaves)

Hoy el sistema opera en **modo interino**: genera el XML v4.4 con clave/consecutivo reales en
estructura pero **provisional** (no consume la secuencia oficial), sin firma XAdES ni transmisión
a Hacienda; las facturas quedan en estado **Borrador** (no válidas fiscalmente).

El interruptor es la env var **`FACTURACION_PRODUCCION`** (default `false`):

- `false` → borrador + numeración provisional (no quema consecutivos).
- `true`  → se consume el **consecutivo definitivo atómico** (`NumeracionService.generarDefinitivo`)
  y la situación queda normal (`1`). El estado final (`Enviada/Aceptada`) lo determina el
  `HaciendaClient` real.

Para ir a producción (sin tocar `facturacion.service`):

1. Implementar `FirmadorReal` (firma **XAdES-BES** usando el `.p12`) y `HaciendaClientReal`
   (OAuth al IDP de Hacienda → `POST` a recepción → consulta de estado) y enchufarlos por DI en
   los tokens `FIRMADOR` / `HACIENDA_CLIENT` de `facturacion.module.ts` (reemplazan los `NoOp`).
2. Subir a Cloud Run como env vars (**nunca al repo**): ruta/clave del `.p12` y credenciales del
   IDP. El `.p12` va en el bucket privado o montado como secreto.
3. Prender el flag:
   ```bash
   gcloud run services update conejo-motors-backend --region us-central1 \
     --update-env-vars FACTURACION_PRODUCCION=true
   ```

> Ventas en dólares: el XML indica `CodigoTipoMoneda = USD` con el `TipoCambio` **congelado** en la
> cotización; el desglose de impuestos permanece coherente con el CRC de los libros (moneda funcional).

## Migraciones
`synchronize: false`. El esquema se cambia por migraciones (`src/migrations`, `data-source.ts`):
```bash
npm run migration:generate -- src/migrations/NombreDelCambio
npm run migration:run
```

## Archivos subidos
- **Documentos sensibles** (comprobantes, documentos de leads): bucket **privado de GCS**, se
  descargan por endpoints **autenticados**. No se sirven desde `/uploads`.
- **Imágenes públicas** (catálogo, logos): `/uploads` (solo imágenes; los tipos documento están
  bloqueados por un filtro en `main.ts`).

## Deploy
```bash
gcloud builds submit --tag gcr.io/conejo-motors/conejo-motors-backend .
gcloud run deploy conejo-motors-backend --image gcr.io/conejo-motors/conejo-motors-backend \
  --platform managed --region us-central1 --add-cloudsql-instances conejo-motors:us-east1:conejo-motors-db
```
> No usar `--set-env-vars` (borra el resto); usar `--update-env-vars` para cambios puntuales.
