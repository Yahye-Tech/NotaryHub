#!/bin/bash
set -e

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_tenants.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_platform_settings.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "UPDATE platform_settings SET ai_ocr_enabled = TRUE, ai_doc_generation_enabled = TRUE, platform_name = 'NotaryHub', branding_color = '#2563EB' WHERE id = 1;" 2>/dev/null
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

SUPER_TOKEN=$(get_token "admin@notaryhub.local" "Admin@2026!")
BOSASO_ADMIN=$(get_token "admin@bosaso-notary.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")

echo "=== BLOCK 1: ACCESS CONTROL ==="

R=$(curl -s "$BASE/api/platform-settings" -H "Authorization: Bearer $BOSASO_ADMIN")
check "1a COMPANY_ADMIN blocked from platform settings" "$R" "FORBIDDEN"

R=$(curl -s "$BASE/api/platform-settings" -H "Authorization: Bearer $SUPER_TOKEN")
check "1b SUPER_ADMIN can view platform settings" "$R" "aiOcrEnabled"

echo "=== BLOCK 2: DEFAULT STATE (both enabled) ==="

check "2a OCR enabled by default" "$R" "\"aiOcrEnabled\":true"
check "2b doc generation enabled by default" "$R" "\"aiDocGenerationEnabled\":true"

echo "=== BLOCK 3: DISABLE DOC GENERATION AND VERIFY ENFORCEMENT ==="

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"aiDocGenerationEnabled":false}')
check "3a SUPER_ADMIN disables doc generation" "$R" "\"aiDocGenerationEnabled\":false"

R=$(curl -s -X POST "$BASE/api/gemini/generate-doc" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"templateType":"Power of Attorney","parties":["A","B"],"jurisdiction":"Puntland"}')
check "3b employee blocked from AI doc generation while disabled" "$R" "FEATURE_DISABLED"

# Re-enable and confirm it's reachable again (falls through to the
# GEMINI_API_KEY-not-configured branch in this environment, which proves
# the feature gate itself is no longer what's blocking it)
R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"aiDocGenerationEnabled":true}')
check "3c SUPER_ADMIN re-enables doc generation" "$R" "\"aiDocGenerationEnabled\":true"

R=$(curl -s -X POST "$BASE/api/gemini/generate-doc" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"templateType":"Power of Attorney","parties":["A","B"],"jurisdiction":"Puntland"}')
check "3d re-enabled: no longer blocked by feature gate (fails later at API key check instead)" "$R" "GEMINI_API_KEY is not configured"

echo "=== BLOCK 4: DISABLE OCR AND VERIFY ENFORCEMENT ==="

curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"aiOcrEnabled":false}' > /dev/null

R=$(curl -s -X POST "$BASE/api/gemini/ocr" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"imageBase64":"ZmFrZQ==","mimeType":"image/jpeg"}')
check "4a employee blocked from OCR while disabled" "$R" "FEATURE_DISABLED"

curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"aiOcrEnabled":true}' > /dev/null

R=$(curl -s -X POST "$BASE/api/gemini/ocr" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"imageBase64":"ZmFrZQ==","mimeType":"image/jpeg"}')
check "4b re-enabled: no longer blocked by feature gate" "$R" "GEMINI_API_KEY is not configured"

echo "=== BLOCK 5: VALIDATION AND AUDIT ==="

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"aiOcrEnabled":"not-a-boolean"}')
check "5a invalid payload rejected" "$R" "VALIDATION_ERROR"

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"aiOcrEnabled":false}')
check "5b COMPANY_ADMIN cannot modify platform settings" "$R" "FORBIDDEN"

AUDIT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM auth_audit_log WHERE action = 'PLATFORM_SETTINGS_UPDATED';" 2>/dev/null | tr -d ' \n')
[ "$AUDIT" -ge "4" ] && { echo "  PASS: 5c platform settings changes audit-logged ($AUDIT events)"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 5c platform settings changes audit-logged (got $AUDIT)"; FAIL=$((FAIL+1)); }

echo "=== BLOCK 6: SINGLETON ROW INTEGRITY ==="

ROWS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM platform_settings;" 2>/dev/null | tr -d ' \n')
[ "$ROWS" -eq "1" ] && { echo "  PASS: 6a exactly one platform_settings row (singleton enforced)"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 6a exactly one platform_settings row (got $ROWS)"; FAIL=$((FAIL+1)); }

echo "=== BLOCK 7: PLATFORM NAME / BRANDING COLOR (Step 16) ==="

# Reset to known defaults so this block is order-independent
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "UPDATE platform_settings SET platform_name = 'NotaryHub', branding_color = '#2563EB' WHERE id = 1;" 2>/dev/null

R=$(curl -s "$BASE/api/platform-settings/public")
check "7a public branding endpoint reachable without auth" "$R" "\"platformName\":\"NotaryHub\""
check "7b public branding does not leak AI flags" "$R" "^{\"branding\":{\"platformName\":\"NotaryHub\",\"brandingColor\":\"#2563EB\"}}$"

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"platformName":"Puntland Notary Group","brandingColor":"#0F766E"}')
check "7c SUPER_ADMIN updates platform name" "$R" "\"platformName\":\"Puntland Notary Group\""
check "7d SUPER_ADMIN updates branding color" "$R" "\"brandingColor\":\"#0F766E\""

R=$(curl -s "$BASE/api/platform-settings/public")
check "7e public endpoint reflects the update immediately" "$R" "\"platformName\":\"Puntland Notary Group\""
check "7f public endpoint reflects updated color" "$R" "\"brandingColor\":\"#0F766E\""

DB_NAME=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT platform_name FROM platform_settings WHERE id = 1;" 2>/dev/null | tr -d '\n')
[ "$DB_NAME" = "Puntland Notary Group" ] && { echo "  PASS: 7g change is actually persisted in the database"; PASS=$((PASS+1)); } \
                                          || { echo "  FAIL: 7g change is actually persisted in the database (got '$DB_NAME')"; FAIL=$((FAIL+1)); }

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"brandingColor":"not-a-hex-color"}')
check "7h invalid hex color rejected" "$R" "VALIDATION_ERROR"

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"platformName\":\"$(python3 -c 'print("x"*61)')\"}")
check "7i platform name over 60 chars rejected" "$R" "VALIDATION_ERROR"

R=$(curl -s -X PATCH "$BASE/api/platform-settings" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"platformName":"Hijacked Name"}')
check "7j COMPANY_ADMIN cannot modify platform name/branding" "$R" "FORBIDDEN"

# Restore defaults so a re-run (or another suite) doesn't inherit this branding
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "UPDATE platform_settings SET platform_name = 'NotaryHub', branding_color = '#2563EB' WHERE id = 1;" 2>/dev/null

kill $SRV 2>/dev/null

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"
[ "$FAIL" -eq 0 ]
