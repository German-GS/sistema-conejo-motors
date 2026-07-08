// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter'; // <-- 1. Importar el filtro

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  app.useGlobalPipes(new ValidationPipe());
  
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