// src/data-source.ts
// Fuente de datos separada para la CLI de TypeORM (migraciones).
// No afecta el AppModule; es solo para los comandos migration:generate y migration:run.

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno del archivo correcto según NODE_ENV
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: join(__dirname, '..', `.env.${env}`) });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME     || 'conejo_motors_dev',
  synchronize: false, // Siempre false en la CLI — usa migraciones
  logging: ['error', 'warn'],
  entities:   [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_history',
});
