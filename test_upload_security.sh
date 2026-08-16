#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

pg_isready -h 127.0.0.1 >/dev/null 2>&1 || pg_ctlcluster 16 main start >/dev/null 2>&1

DATABASE_URL="${DATABASE_URL:-postgresql://notaryhub:notaryhub_dev_2026@127.0.0.1:5432/notaryhub}"

NODE_ENV=production API_ONLY=true TEST_SKIP_EMAIL_INIT=true TEST_SKIP_RATE_LIMIT=true \
  JWT_ACCESS_SECRET='upload-security-test-access-secret' JWT_REFRESH_SECRET='upload-security-test-refresh-secret' \
  DATABASE_URL="$DATABASE_URL" npx tsx server.ts >/tmp/notaryhub-upload-security.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 20); do
  sleep 1
  curl -sf --max-time 1 http://localhost:3000/api/health >/dev/null 2>&1 && break
done

BASE="http://localhost:3000/api"
PASS=0
FAIL=0
check() {
  if printf '%s' "$2" | grep -q "$3"; then
    echo "  PASS: $1"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $1"
    echo "    expected: $3"
    echo "    got: $2"
    FAIL=$((FAIL + 1))
  fi
}

LOGIN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@bosaso-notary.com","password":"Admin@2026!"}')
TOKEN=$(printf '%s' "$LOGIN" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("accessToken", ""))')

FAKE_CONTENT=$(printf 'this is not a pdf' | base64 -w0)
FAKE_RESPONSE=$(curl -s -X POST "$BASE/uploads" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"fileName\":\"forged.pdf\",\"mimeType\":\"application/pdf\",\"contentBase64\":\"$FAKE_CONTENT\"}")
check "magic bytes reject content disguised as PDF" "$FAKE_RESPONSE" "INVALID_FILE_CONTENT"

PDF_CONTENT=$(printf '%s' '%PDF-1.4\nNotaryHub security test\n%%EOF' | base64 -w0)
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE/uploads" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"fileName\":\"security-test.pdf\",\"mimeType\":\"application/pdf\",\"contentBase64\":\"$PDF_CONTENT\"}")
UPLOAD_ID=$(printf '%s' "$UPLOAD_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("upload",{}).get("id", ""))')
check "valid PDF signature is accepted" "$UPLOAD_RESPONSE" 'File uploaded'

if [ -n "$UPLOAD_ID" ]; then
  DOWNLOAD_HEADERS=$(curl -si "$BASE/uploads/$UPLOAD_ID/download" -H "Authorization: Bearer $TOKEN")
  check "downloads include X-Content-Type-Options nosniff" "$DOWNLOAD_HEADERS" 'X-Content-Type-Options: nosniff'
  curl -s -X DELETE "$BASE/uploads/$UPLOAD_ID" -H "Authorization: Bearer $TOKEN" >/dev/null
fi

echo "FINAL: $PASS passed / $((PASS + FAIL)) total | FAIL: $FAIL"
[ "$FAIL" -eq 0 ]
