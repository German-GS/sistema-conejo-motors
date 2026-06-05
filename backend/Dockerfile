# ── Etapa 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Etapa 2: Producción ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar build compilado
COPY --from=builder /app/dist ./dist

# Carpeta uploads (imágenes de vehículos)
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/main"]
