#!/bin/bash
set -e

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_tenants.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_full.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "DELETE FROM file_uploads;" 2>/dev/null
echo "DB seeded."

cd /home/claude/notaryhub
NODE_ENV=production API_ONLY=true TEST_SKIP_RATE_LIMIT=true npx tsx server.ts > /tmp/srv.log 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  sleep 1
  curl -sf --max-time 1 http://localhost:3000/api/health > /dev/null 2>&1 && break
done

BASE="http://localhost:3000"
PASS=0; FAIL=0

check() {
  if echo "$2" | grep -q "$3"; then
    echo "  PASS: $1"; PASS=$((PASS+1))
  else
    echo "  FAIL: $1"; echo "    expected: $3"; echo "    got:      $2"; FAIL=$((FAIL+1))
  fi
}

get_token() {
  curl -si -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | tail -1 | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken','FAILED'))" 2>/dev/null
}

BOSASO_ADMIN=$(get_token "admin@bosaso-notary.com" "Admin@2026!")
PUNTLAND_ADMIN=$(get_token "admin@puntland-legal.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")
BOSASO_BRANCH="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"

CUSTOMER_ID=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT id FROM customers WHERE full_name = 'Hodan Jama' LIMIT 1;")

echo "=== BLOCK 1: DOCUMENT SETUP AND NOTARISATION ==="

R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_BRANCH\",\"title\":\"Certificate Test Doc\",\"docType\":\"POWER_OF_ATTORNEY\",\"content\":\"This is the notarized text body.\",\"customerId\":\"$CUSTOMER_ID\"}")
check "1a document created" "$R" "Certificate Test Doc"
DOC_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['document']['id'])" 2>/dev/null)

for status in pending_review approved signed; do
  curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
    -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
    -d "{\"status\":\"$status\"}" > /dev/null
done

R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"notarised"}')
check "1b document notarised" "$R" '"status":"notarised"'
SEAL=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['document']['seal_code'])" 2>/dev/null)

echo "=== BLOCK 2: CERTIFICATE GENERATION (async, fire-and-forget) ==="

# The PDF is generated fire-and-forget after the transition response, so poll
# briefly for file_url to appear rather than assuming it's instant.
FILE_URL=""
for i in $(seq 1 15); do
  sleep 0.5
  R=$(curl -s "$BASE/api/documents/$DOC_ID" -H "Authorization: Bearer $BOSASO_ADMIN")
  FILE_URL=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['document'].get('file_url') or '')" 2>/dev/null)
  [ -n "$FILE_URL" ] && break
done

[ -n "$FILE_URL" ] && { echo "  PASS: 2a certificate file_url populated ($FILE_URL)"; PASS=$((PASS+1)); } \
                    || { echo "  FAIL: 2a certificate file_url populated (timed out)"; FAIL=$((FAIL+1)); }

check "2b file_url points at the uploads download endpoint" "$FILE_URL" "/api/uploads/.*\/download"
UPLOAD_ID=$(echo "$FILE_URL" | python3 -c "import sys,re; m=re.search(r'/api/uploads/([^/]+)/download', sys.stdin.read()); print(m.group(1) if m else '')" 2>/dev/null)

R=$(curl -s "$BASE/api/documents/$DOC_ID" -H "Authorization: Bearer $BOSASO_ADMIN")
check "2c file_mime_type set to application/pdf" "$R" "\"file_mime_type\":\"application/pdf\""
check "2d file_size_bytes populated (non-zero)" "$R" "\"file_size_bytes\":\"[1-9]"
check "2e file_hash populated" "$R" "\"file_hash\":\"[a-f0-9]\{10\}"

echo "=== BLOCK 3: DOWNLOAD AND PDF INTEGRITY ==="

curl -s "$BASE/api/uploads/$UPLOAD_ID/download" -H "Authorization: Bearer $BOSASO_ADMIN" -o /tmp/cert_test.pdf
MAGIC=$(head -c 4 /tmp/cert_test.pdf)
[ "$MAGIC" = "%PDF" ] && { echo "  PASS: 3a downloaded file is a real PDF (%PDF magic bytes)"; PASS=$((PASS+1)); } \
                       || { echo "  FAIL: 3a downloaded file is a real PDF (got magic: $MAGIC)"; FAIL=$((FAIL+1)); }

SIZE=$(wc -c < /tmp/cert_test.pdf | tr -d ' ')
[ "$SIZE" -gt "500" ] && { echo "  PASS: 3b PDF has substantive content ($SIZE bytes)"; PASS=$((PASS+1)); } \
                       || { echo "  FAIL: 3b PDF has substantive content (only $SIZE bytes)"; FAIL=$((FAIL+1)); }

# Confirm the seal code the transition returned is actually embedded in the PDF text
if command -v pdftotext > /dev/null 2>&1; then
  pdftotext /tmp/cert_test.pdf /tmp/cert_test.txt 2>/dev/null
  check "3c seal code embedded in PDF text" "$(cat /tmp/cert_test.txt 2>/dev/null)" "$SEAL"
  check "3d document content embedded in PDF text" "$(cat /tmp/cert_test.txt 2>/dev/null)" "notarized text body"
else
  echo "  SKIP: 3c/3d (pdftotext not available in this environment)"
fi

echo "=== BLOCK 4: ACCESS CONTROL ==="

R=$(curl -s "$BASE/api/uploads/$UPLOAD_ID/download" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "4a Puntland (other tenant) cannot download Bosaso's certificate" "$R" "FORBIDDEN\|NOT_FOUND"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/uploads/$UPLOAD_ID/download")
check "4b unauthenticated download rejected" "$R" "401"

R=$(curl -s "$BASE/api/uploads" -H "Authorization: Bearer $BOSASO_ADMIN")
check "4c certificate appears in Bosaso's own uploads list" "$R" "notary_certificate"

kill $SRV 2>/dev/null

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"
[ "$FAIL" -eq 0 ]
