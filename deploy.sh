#!/bin/bash
# ================================================================
# deploy.sh — Script de deployment completo para Conejo Motors
# Uso: bash deploy.sh
# Requisitos: gcloud CLI y firebase CLI instalados y autenticados
# ================================================================

set -e  # Detener si hay error

PROJECT_ID="conejo-motors"
REGION="us-east1"
SERVICE_NAME="conejo-motors-backend"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"
CLOUD_SQL_INSTANCE="conejo-motors:us-east1:conejo-motors-db"

echo "================================================"
echo "  DEPLOY CONEJO MOTORS"
echo "================================================"

# ── 1. Generar JWT_SECRET seguro ─────────────────────────────────
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "✅ JWT_SECRET generado"

# ── 2. Build y push imagen Docker al Container Registry ──────────
echo ""
echo "📦 Construyendo imagen Docker del backend..."
cd backend
gcloud builds submit --tag "$IMAGE" .
echo "✅ Imagen subida a $IMAGE"

# ── 3. Deploy en Cloud Run ────────────────────────────────────────
echo ""
echo "🚀 Desplegando backend en Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=3000" \
  --set-env-vars "DB_HOST=/cloudsql/$CLOUD_SQL_INSTANCE" \
  --set-env-vars "DB_PORT=5432" \
  --set-env-vars "DB_USERNAME=conejo_app" \
  --set-env-vars "DB_PASSWORD=ARfGiu7e)lu?7(vQ" \
  --set-env-vars "DB_NAME=conejo_motors" \
  --set-env-vars "JWT_SECRET=$JWT_SECRET" \
  --set-env-vars "CORS_ORIGINS=https://conejo-motors.web.app,https://conejo-motors.firebaseapp.com" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 3000

# Obtener URL del backend
BACKEND_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --format "value(status.url)")

echo "✅ Backend desplegado en: $BACKEND_URL"

# ── 4. Actualizar URL del backend en el frontend ─────────────────
cd ../frontend
echo ""
echo "⚙️  Actualizando VITE_API_URL en el frontend..."
echo "VITE_API_URL=$BACKEND_URL" > .env.production
echo "✅ .env.production actualizado"

# ── 5. Build del frontend ─────────────────────────────────────────
echo ""
echo "🔨 Construyendo frontend (React/Vite)..."
npm run build
echo "✅ Frontend construido en dist/"

# ── 6. Deploy en Firebase Hosting ────────────────────────────────
echo ""
echo "🌐 Desplegando frontend en Firebase Hosting..."
npx firebase deploy --only hosting
echo "✅ Frontend desplegado"

echo ""
echo "================================================"
echo "  ✅ DEPLOYMENT COMPLETO"
echo "================================================"
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: https://conejo-motors.web.app"
echo "================================================"
