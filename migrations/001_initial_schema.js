import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(migrationDir, "..");
const orderedSchemaFiles = [
  "src/db/schema.sql",
  "src/db/schema_tenants.sql",
  "src/db/schema_full.sql",
  "src/db/schema_appointments.sql",
  "src/db/schema_queue.sql",
  "src/db/schema_uploads.sql",
  "src/db/schema_permissions.sql",
  "src/db/schema_invoices.sql",
  "src/db/schema_platform_settings.sql",
];

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const schemaSql = orderedSchemaFiles
    .map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8"))
    .join("\n\n");
  pgm.sql(schemaSql);
  pgm.sql(`
    INSERT INTO schema_version (version)
    VALUES (1)
    ON CONFLICT (version) DO NOTHING;
  `);
}

export async function down(pgm) {
  pgm.sql("DELETE FROM schema_version WHERE version = 1;");
}
