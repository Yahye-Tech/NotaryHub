export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_host TEXT;
    ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
    ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_user TEXT;
    ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN;
    DO $$ BEGIN
      ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_smtp_port_range
        CHECK (smtp_port IS NULL OR smtp_port BETWEEN 1 AND 65535);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE platform_settings DROP CONSTRAINT IF EXISTS platform_settings_smtp_port_range;
    ALTER TABLE platform_settings
      DROP COLUMN IF EXISTS smtp_host,
      DROP COLUMN IF EXISTS smtp_port,
      DROP COLUMN IF EXISTS smtp_user,
      DROP COLUMN IF EXISTS smtp_secure;
  `);
}
