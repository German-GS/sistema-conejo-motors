// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter'; // <-- 1. Importar el filtro

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cabeceras de seguridad (API-only). Se desactiva CSP (rompería la representación
  // gráfica HTML de comprobantes/proformas con estilos inline) y crossOriginResourcePolicy
  // (para no bloquear la carga de las imágenes públicas del catálogo desde el frontend).
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  // Detrás del proxy de Cloud Run: usar X-Forwarded-For para la IP real del cliente
  // (necesario para que el rate limiting sea por usuario y no global).
  app.set('trust proxy', 1);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  // Validación endurecida SIN romper el frontend:
  //  - whitelist: descarta en silencio campos no declarados en el DTO.
  //  - transform: convierte tipos (p. ej. "5" → 5) según el DTO.
  //  - NO se usa forbidNonWhitelisted (rechazaría requests con campos extra y rompería el front).
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  
  // --- 👇 LÍNEA AÑADIDA 👇 ---
  app.useGlobalFilters(new AllExceptionsFilter()); // <-- 2. Registrar el filtro globalmente
  // -------------------------

  // CORS: dominios de producción siempre permitidos + los que agregue CORS_ORIGINS
  const origenesBase = [
    'https://sistema.conejomotors.com',
    'https://conejo-motors.web.app',
    'https://conejo-motors.firebaseapp.com',
    'http://localhost:5173',
  ];
  const origenesEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowedOrigins = [...new Set([...origenesBase, ...origenesEnv])];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (apps móviles, Postman, mismo servidor)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origen no permitido → ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();