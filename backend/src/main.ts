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

  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();