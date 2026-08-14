#!/usr/bin/env bash
# Shared environment and prerequisite checks for the NotaryHub integration suites.
# Override TEST_DATABASE_URL when running against a different PostgreSQL instance.

TEST_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-${DATABASE_URL:-postgresql://notaryhub:notaryhub_dev_2026@127.0.0.1:5432/notaryhub}}"
TEST_PORT="${TEST_PORT:-3000}"
DATABASE_URL="${DATABASE_URL:-$TEST_DATABASE_URL}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-test_access_secret}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-test_refresh_secret}"
TEST_SKIP_EMAIL_INIT="${TEST_SKIP_EMAIL_INIT:-true}"

export TEST_ROOT TEST_DATABASE_URL TEST_PORT DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET TEST_SKIP_EMAIL_INIT

require_test_dependencies() {
  if ! command -v psql >/dev/null 2>&1; then
    echo "ERROR: PostgreSQL client 'psql' is required to run this test suite." >&2
    echo "Install PostgreSQL client tools or set up the project CI service first." >&2
    exit 2
  fi

  if ! psql "$TEST_DATABASE_URL" -qAtc "SELECT 1" >/dev/null 2>&1; then
    echo "ERROR: Cannot connect to TEST_DATABASE_URL." >&2
    echo "Current target: ${TEST_DATABASE_URL%%\?*}" >&2
    echo "Start PostgreSQL, create the database, or export TEST_DATABASE_URL." >&2
    exit 2
  fi
}

psql_test() {
  psql "$TEST_DATABASE_URL" "$@"
}

require_test_dependencies
