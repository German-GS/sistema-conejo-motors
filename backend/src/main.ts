import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; // <-- 1. IMPORTA ESTO
import { join } from 'path'; // <-- 2. IMPORTA ESTO

async function bootstrap() {
  // --- 👇 3. CAMBIA "create" por "create<NestExpressApplication>" 👇 ---
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- 👇 4. AÑADE ESTA LÍNEA 👇 ---
  // Esto hace que la carpeta 'uploads' sea accesible públicamente
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  // ------------------------------------

  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
