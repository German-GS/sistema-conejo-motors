import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Venta pactada en dólares: precio_venta_usd (valor fijo con IVA) + tipo_cambio congelado,
 * en cotizaciones y ventas. El CRC (precio_final/monto_final) queda derivado y congelado.
 * Idempotente.
 */
export class VentaEnDolares1752900000000 implements MigrationInterface {
  name = 'VentaEnDolares1752900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "precio_venta_usd" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "tipo_cambio" numeric(12,5)`);
    await queryRunner.query(`ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "precio_venta_usd" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "tipo_cambio" numeric(12,5)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ventas" DROP COLUMN IF EXISTS "tipo_cambio"`);
    await queryRunner.query(`ALTER TABLE "ventas" DROP COLUMN IF EXISTS "precio_venta_usd"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "tipo_cambio"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "precio_venta_usd"`);
  }
}
