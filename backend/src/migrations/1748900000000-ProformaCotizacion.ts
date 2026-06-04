import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProformaCotizacion1748900000000 implements MigrationInterface {
  name = 'ProformaCotizacion1748900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nuevos campos de la factura proforma en cotizaciones
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "precio_lista" DECIMAL(12,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "descuento_monto" DECIMAL(12,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "gasto_marchamo" DECIMAL(12,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "gasto_inscripcion" DECIMAL(12,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "gasto_placas" DECIMAL(12,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "gasto_otros" DECIMAL(12,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "gasto_otros_descripcion" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "regalias" TEXT`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "notas_cliente" TEXT`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "leadId" INTEGER REFERENCES "leads"("id") ON DELETE SET NULL`);

    // Nuevos campos de lead (si no existen de synchronize)
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "fuente" VARCHAR DEFAULT 'Otro'`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notas" TEXT`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "fecha_followup" DATE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "precio_lista"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "descuento_monto"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "gasto_marchamo"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "gasto_inscripcion"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "gasto_placas"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "gasto_otros"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "gasto_otros_descripcion"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "regalias"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "notas_cliente"`);
    await queryRunner.query(`ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "leadId"`);
  }
}
