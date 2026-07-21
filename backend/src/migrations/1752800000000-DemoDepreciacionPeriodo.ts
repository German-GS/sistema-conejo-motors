import { MigrationInterface, QueryRunner } from 'typeorm';

/** Guarda mensual de la depreciación financiera de vehículos demo (idempotencia). Idempotente. */
export class DemoDepreciacionPeriodo1752800000000 implements MigrationInterface {
  name = 'DemoDepreciacionPeriodo1752800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehiculos" ADD COLUMN IF NOT EXISTS "ultimo_periodo_depreciado_demo" varchar(7)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehiculos" DROP COLUMN IF EXISTS "ultimo_periodo_depreciado_demo"`);
  }
}
