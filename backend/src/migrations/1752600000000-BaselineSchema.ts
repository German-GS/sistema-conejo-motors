import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * LÍNEA DE BASE (2026-07).
 *
 * Hasta este punto el esquema se creó/mantuvo con `synchronize: true`. A partir de acá
 * `synchronize` queda en `false` y todo cambio de esquema va por migraciones.
 *
 * Esta migración es un NO-OP a propósito: la base ya tiene el esquema completo, así que no
 * hay nada que aplicar. Sirve como marcador del punto de partida para `migration:generate`
 * y para que `migration:run` sea seguro (no altera datos). Las migraciones previas
 * (p. ej. ProformaCotizacion) usan `IF NOT EXISTS`, por lo que también son idempotentes.
 */
export class BaselineSchema1752600000000 implements MigrationInterface {
  name = 'BaselineSchema1752600000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Intencionalmente vacío: el esquema ya está aplicado.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: no se revierte una línea de base.
  }
}
