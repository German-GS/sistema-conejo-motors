import { MigrationInterface, QueryRunner } from 'typeorm';

/** Passkeys (WebAuthn): tabla de credenciales + challenge efímero en usuarios. Idempotente. */
export class Passkeys1752700000000 implements MigrationInterface {
  name = 'Passkeys1752700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "webauthn_challenge" varchar(500)`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "passkey_credentials" (
        "id" SERIAL PRIMARY KEY,
        "credential_id" varchar(512) NOT NULL,
        "public_key" text NOT NULL,
        "counter" bigint NOT NULL DEFAULT 0,
        "transports" varchar(255),
        "device_name" varchar(100),
        "usuarioId" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_passkey_credential_id" ON "passkey_credentials" ("credential_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "passkey_credentials"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "webauthn_challenge"`);
  }
}
