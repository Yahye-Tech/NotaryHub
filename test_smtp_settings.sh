#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_USER="notaryhub"
DB_NAME="notaryhub"
DB_PASSWORD="notaryhub_dev_2026"
PORT="3100"
BASE="http://localhost:${PORT}"

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" -q -f "$ROOT/test_setup.sql" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" -q -f "$ROOT/src/db/schema_tenants.sql" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" -q -f "$ROOT/src/db/schema_platform_settings.sql" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" -q \
  -c "UPDATE platform_settings SET smtp_host = NULL, smtp_port = NULL, smtp_user = NULL, smtp_secure = NULL WHERE id = 1;" 2>/dev/null
echo "DB seeded."

cd "$ROOT"
NODE_ENV=production API_ONLY=true TEST_SKIP_RATE_LIMIT=true PORT="$PORT" \
JWT_ACCESS_SECRET="smtp-test-access-secret" JWT_REFRESH_SECRET="smtp-test-refresh-secret" \
SMTP_USER="mailer@example.com" SMTP_PASS="test-secret-not-persisted" \
npx tsx server.ts > /tmp/notaryhub-smtp-test.log 2>&1 &
SRV=$!
trap 'kill "$SRV" 2>/dev/null || true' EXIT

for _ in $(seq 1 20); do
  sleep 1
  curl -sf --max-time 1 "$BASE/api/health" > /dev/null 2>&1 && break
done

PASS=0
FAIL=0
check() {
  if echo "$2" | grep -q "$3"; then
    echo "  PASS: $1"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $1"
    echo "    expected: $3"
    echo "    got:      $2"
    FAIL=$((FAIL + 1))
  fi
}

get_token() {
  curl -si -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | tail -1 | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken','FAILED'))" 2>/dev/null
}

SUPER_TOKEN="$(get_token "admin@notaryhub.local" "Admin@2026!")"
COMPANY_TOKEN="$(get_token "admin@bosaso-notary.com" "Admin@2026!")"

R=$(curl -s "$BASE/api/platform-settings" -H "Authorization: Bearer $SUPER_TOKEN")
check "SUPER_ADMIN can view SMTP settings" "$R" '"smtpPasswordConfigured":true'
python3 -c 'import json,sys; d=json.load(sys.stdin); assert "smtpPassword" not in d["settings"], d' <<< "$R"
echo "  PASS: SMTP password is not present in the API response"
PASS=$((PASS + 1))

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"smtpHost":"smtp.example.com","smtpPort":587,"smtpUser":"mailer@example.com","smtpSecure":true}')
check "SUPER_ADMIN can save SMTP host" "$R" '"smtpHost":"smtp.example.com"'
check "SUPER_ADMIN can save SMTP port" "$R" '"smtpPort":587'
check "SUPER_ADMIN can save SMTP secure flag" "$R" '"smtpSecure":true'

R=$(curl -s "$BASE/api/platform-settings" -H "Authorization: Bearer $SUPER_TOKEN")
check "SMTP settings are readable after save" "$R" '"smtpUser":"mailer@example.com"'

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"smtpPort":70000}')
check "Invalid SMTP port is rejected" "$R" 'VALIDATION_ERROR'

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $COMPANY_TOKEN" -H "Content-Type: application/json" \
  -d '{"smtpHost":"attacker.example.com"}')
check "COMPANY_ADMIN cannot modify SMTP settings" "$R" 'FORBIDDEN'

PASSWORD_COLUMN=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" -Atc \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'smtp_pass';" | tr -d ' \n')
if [ "$PASSWORD_COLUMN" = "0" ]; then
  echo "  PASS: platform_settings has no SMTP password column"
  PASS=$((PASS + 1))
else
  echo "  FAIL: platform_settings unexpectedly has an SMTP password column"
  FAIL=$((FAIL + 1))
fi

PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" -q \
  -c "UPDATE platform_settings SET smtp_host = NULL, smtp_port = NULL, smtp_user = NULL, smtp_secure = NULL WHERE id = 1;" 2>/dev/null

kill "$SRV" 2>/dev/null || true
trap - EXIT

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS + FAIL)) total | FAIL: $FAIL"
echo "============================================"
[ "$FAIL" -eq 0 ]
