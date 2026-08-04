#!/bin/bash
set -e

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

# Clean state then re-seed with correct data (same pattern as other suites)
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_tenants.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "DELETE FROM tenant_permissions;" 2>/dev/null
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
PUNTLAND_ADMIN=$(get_token "admin@puntland-legal.com" "Admin@2026!")
BOSASO_BRANCH_ADMIN=$(get_token "supervisor@bosaso-main.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")     # EMPLOYEE, Bosaso
SANCHEZ_TOKEN=$(get_token "r.sanchez@puntland-legal.com" "Admin@2026!") # EMPLOYEE, Puntland

BOSASO_ID="886c9f73-82a4-4e75-a023-cc4802712c52"
BOSASO_MAIN_BRANCH="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"

echo "=== BLOCK 1: MATRIX RETRIEVAL & ROLE GATING ==="

R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/permissions")
check "1a COMPANY_ADMIN gets effective matrix" "$R" "\"scope\":\"tenant\""
check "1b hardcoded fallback present (EMPLOYEE.CREATE_DOCUMENT true)" "$R" "\"CREATE_DOCUMENT\":true"

R=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" "$BASE/api/permissions/platform")
check "1c SUPER_ADMIN gets platform matrix" "$R" "\"scope\":\"platform\""

R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/permissions/platform")
check "1d COMPANY_ADMIN blocked from platform matrix" "$R" "FORBIDDEN"

R=$(curl -s -H "Authorization: Bearer $VANCE_TOKEN" "$BASE/api/permissions")
check "1e EMPLOYEE blocked from viewing permissions matrix" "$R" "FORBIDDEN"

echo "=== BLOCK 2: TENANT OVERRIDE ENFORCEMENT ==="

# Bosaso admin revokes EMPLOYEE.CREATE_DOCUMENT for their own tenant only
R=$(curl -s -X PATCH "$BASE/api/permissions" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"role":"EMPLOYEE","permissionKey":"CREATE_DOCUMENT","allowed":false}')
check "2a COMPANY_ADMIN sets tenant override" "$R" "Permission updated"

# Vance (EMPLOYEE @ Bosaso) can no longer create documents
R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_MAIN_BRANCH\",\"title\":\"Blocked Doc\",\"docType\":\"AFFIDAVIT\"}")
check "2b EMPLOYEE blocked from CREATE_DOCUMENT after override" "$R" "PERMISSION_DENIED"

# Sanchez (EMPLOYEE @ Puntland) is unaffected — tenant isolation of overrides
R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $SANCHEZ_TOKEN" -H "Content-Type: application/json" \
  -d '{"branchId":"5f12bfe5-ca47-4bea-a8e9-6ae9f6bbe6ad","title":"Puntland Doc","docType":"AFFIDAVIT"}')
check "2c EMPLOYEE at other tenant unaffected by override" "$R" "Document created"

# Reset the override back to platform default
R=$(curl -s -X DELETE "$BASE/api/permissions?role=EMPLOYEE&permissionKey=CREATE_DOCUMENT" \
  -H "Authorization: Bearer $BOSASO_ADMIN")
check "2d COMPANY_ADMIN resets tenant override" "$R" "reverted to platform default"

# Vance can create documents again
R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_MAIN_BRANCH\",\"title\":\"Unblocked Doc\",\"docType\":\"AFFIDAVIT\"}")
check "2e EMPLOYEE can create documents again after reset" "$R" "Document created"

echo "=== BLOCK 3: PLATFORM DEFAULT LAYERING ==="

# SUPER_ADMIN turns off VIEW_REPORTS for BRANCH_ADMIN platform-wide
R=$(curl -s -X PATCH "$BASE/api/permissions/platform" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"BRANCH_ADMIN","permissionKey":"VIEW_REPORTS","allowed":false}')
check "3a SUPER_ADMIN sets platform default" "$R" "Platform default updated"

# Puntland (no tenant override) inherits the platform default
R=$(curl -s -H "Authorization: Bearer $PUNTLAND_ADMIN" "$BASE/api/permissions")
check "3b tenant with no override inherits platform default" "$R" "\"BRANCH_ADMIN\":{\"CREATE_DOCUMENT\":true,\"EDIT_DOCUMENT\":true,\"DELETE_DOCUMENT\":false,\"VIEW_REPORTS\":false"

# Bosaso branch admin is blocked from a VIEW_REPORTS-gated analytics endpoint
R=$(curl -s -H "Authorization: Bearer $BOSASO_BRANCH_ADMIN" "$BASE/api/analytics/branch-report?branchId=$BOSASO_MAIN_BRANCH")
check "3c BRANCH_ADMIN blocked from branch-report by platform default" "$R" "PERMISSION_DENIED"

# Restore platform default
R=$(curl -s -X PATCH "$BASE/api/permissions/platform" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"BRANCH_ADMIN","permissionKey":"VIEW_REPORTS","allowed":true}')
check "3d SUPER_ADMIN restores platform default" "$R" "Platform default updated"

R=$(curl -s -H "Authorization: Bearer $BOSASO_BRANCH_ADMIN" "$BASE/api/analytics/branch-report?branchId=$BOSASO_MAIN_BRANCH")
check "3e BRANCH_ADMIN regains access after restore" "$R" "documentsProcessed"

echo "=== BLOCK 4: IMMUTABLE LOCK ==="

R=$(curl -s -X PATCH "$BASE/api/permissions/platform" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"SUPER_ADMIN","permissionKey":"MANAGE_SUBSCRIPTIONS","allowed":false}')
check "4a SUPER_ADMIN cannot revoke own MANAGE_SUBSCRIPTIONS" "$R" "PERMISSION_LOCKED"

R=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" "$BASE/api/permissions/platform")
check "4b SUPER_ADMIN.MANAGE_SUBSCRIPTIONS still true" "$R" "\"SUPER_ADMIN\":{\"CREATE_DOCUMENT\":true,\"EDIT_DOCUMENT\":true,\"DELETE_DOCUMENT\":true,\"VIEW_REPORTS\":true,\"CREATE_EMPLOYEE\":true,\"CREATE_BRANCH\":true,\"MANAGE_SUBSCRIPTIONS\":true"

echo "=== BLOCK 5: VALIDATION ==="

R=$(curl -s -X PATCH "$BASE/api/permissions" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"role":"NOT_A_ROLE","permissionKey":"CREATE_DOCUMENT","allowed":false}')
check "5a invalid role rejected" "$R" "VALIDATION_ERROR"

R=$(curl -s -X PATCH "$BASE/api/permissions" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"role":"EMPLOYEE","permissionKey":"NOT_A_KEY","allowed":false}')
check "5b invalid permission key rejected" "$R" "VALIDATION_ERROR"

echo "=== BLOCK 6: CROSS-TENANT ISOLATION OF OVERRIDES ==="

# Bosaso sets its own override; Puntland's matrix must remain untouched
curl -s -X PATCH "$BASE/api/permissions" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"role":"EMPLOYEE","permissionKey":"EDIT_DOCUMENT","allowed":false}' > /dev/null

R=$(curl -s -H "Authorization: Bearer $PUNTLAND_ADMIN" "$BASE/api/permissions")
check "6a Puntland unaffected by Bosaso's override" "$R" "\"EMPLOYEE\":{\"CREATE_DOCUMENT\":true,\"EDIT_DOCUMENT\":true"

R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/permissions")
check "6b Bosaso sees its own override" "$R" "\"EMPLOYEE\":{\"CREATE_DOCUMENT\":true,\"EDIT_DOCUMENT\":false"

echo "=== BLOCK 7: DATABASE INTEGRITY ==="

ROWS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM tenant_permissions;" 2>/dev/null | tr -d ' \n')
[ "$ROWS" -ge "2" ] && { echo "  PASS: 7a tenant_permissions rows persisted ($ROWS rows)"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 7a tenant_permissions rows persisted (got $ROWS)"; FAIL=$((FAIL+1)); }

AUDIT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM auth_audit_log WHERE action IN ('PERMISSION_UPDATED','PERMISSION_RESET');" 2>/dev/null | tr -d ' \n')
[ "$AUDIT" -ge "1" ] && { echo "  PASS: 7b permission changes audit-logged ($AUDIT events)"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: 7b permission changes audit-logged (got $AUDIT)"; FAIL=$((FAIL+1)); }

kill $SRV 2>/dev/null

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"
[ "$FAIL" -eq 0 ]
