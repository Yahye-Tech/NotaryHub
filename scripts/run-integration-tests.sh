#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/test-env.sh"

for schema in \
  src/db/schema.sql \
  src/db/schema_tenants.sql \
  src/db/schema_full.sql \
  src/db/schema_appointments.sql \
  src/db/schema_queue.sql \
  src/db/schema_uploads.sql \
  src/db/schema_permissions.sql \
  src/db/schema_invoices.sql \
  src/db/schema_platform_settings.sql; do
  echo "===== Applying $schema ====="
  psql_test -v ON_ERROR_STOP=1 -f "$ROOT_DIR/$schema"
done

for suite in \
  test_schema.sh \
  test_auth.sh \
  test_tenants.sh \
  test_documents.sh \
  test_queue.sh \
  test_notifications.sh \
  test_permissions.sh \
  test_invoices.sh \
  test_certificates.sh \
  test_platform_settings.sh; do
  echo "===== Running $suite ====="
  bash "$ROOT_DIR/$suite"
done
