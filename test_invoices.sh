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
  -c "DELETE FROM tenant_permissions; DELETE FROM invoice_items; DELETE FROM invoices;" 2>/dev/null
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
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")

BOSASO_MAIN_BRANCH="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"

CUSTOMER_ID=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT id FROM customers WHERE full_name = 'Hodan Jama' LIMIT 1;")

echo "=== BLOCK 1: ROLE GATING ==="

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"dueDate\":\"2026-12-31\",\"items\":[{\"description\":\"Notarization fee\",\"quantity\":1,\"unitPriceCents\":5000}]}")
check "1a EMPLOYEE blocked by permission matrix (no MANAGE_INVOICES by default)" "$R" "PERMISSION_DENIED"

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $BOSASO_BRANCH_ADMIN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"branchId\":\"$BOSASO_MAIN_BRANCH\",\"dueDate\":\"2026-12-31\",\"items\":[{\"description\":\"Notarization fee\",\"quantity\":1,\"unitPriceCents\":5000}]}")
check "1b BRANCH_ADMIN can create invoices (MANAGE_INVOICES true by default)" "$R" "Invoice created"

echo "=== BLOCK 2: CREATE + RACE-SAFE NUMBERING + TOTAL CALC ==="

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"branchId\":\"$BOSASO_MAIN_BRANCH\",\"dueDate\":\"2026-12-31\",\"items\":[{\"description\":\"Affidavit\",\"quantity\":2,\"unitPriceCents\":2500},{\"description\":\"Notary stamp fee\",\"quantity\":1,\"unitPriceCents\":1000}],\"taxCents\":300}")
check "2a invoice created with correct total (2*2500+1000+300=6300)" "$R" "\"total_cents\":6300"
INV1_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['invoice']['id'])" 2>/dev/null)
INV1_NUM=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['invoice']['invoice_number'])" 2>/dev/null)

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"branchId\":\"$BOSASO_MAIN_BRANCH\",\"dueDate\":\"2026-12-31\",\"items\":[{\"description\":\"POA drafting\",\"quantity\":1,\"unitPriceCents\":15000}]}")
INV2_NUM=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['invoice']['invoice_number'])" 2>/dev/null)
[ "$INV1_NUM" != "$INV2_NUM" ] && { echo "  PASS: 2b sequential invoice numbers unique ($INV1_NUM vs $INV2_NUM)"; PASS=$((PASS+1)); } \
                                || { echo "  FAIL: 2b invoice numbers not unique"; FAIL=$((FAIL+1)); }

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"dueDate\":\"2026-12-31\",\"items\":[]}")
check "2c empty items rejected" "$R" "VALIDATION_ERROR"

echo "=== BLOCK 3: PAYMENT RECORDING ==="

R=$(curl -s -X PATCH "$BASE/api/invoices/$INV1_ID/pay" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}')
check "3a payment recorded" "$R" "\"status\":\"paid\""

R=$(curl -s -X PATCH "$BASE/api/invoices/$INV1_ID/pay" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"paymentMethod":"card"}')
check "3b cannot re-pay an already-paid invoice" "$R" "INVOICE_NOT_PAYABLE"

R=$(curl -s -X PATCH "$BASE/api/invoices/$INV1_ID/void" \
  -H "Authorization: Bearer $BOSASO_ADMIN")
check "3c cannot void a paid invoice" "$R" "INVOICE_NOT_FOUND_OR_PAID"

echo "=== BLOCK 4: VOID ==="

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"dueDate\":\"2026-12-31\",\"items\":[{\"description\":\"Cancelled service\",\"quantity\":1,\"unitPriceCents\":1000}]}")
INV3_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['invoice']['id'])" 2>/dev/null)

R=$(curl -s -X PATCH "$BASE/api/invoices/$INV3_ID/void" -H "Authorization: Bearer $BOSASO_ADMIN")
check "4a invoice voided" "$R" "\"status\":\"void\""

R=$(curl -s -X PATCH "$BASE/api/invoices/$INV3_ID/pay" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}')
check "4b cannot pay a voided invoice" "$R" "INVOICE_NOT_PAYABLE"

echo "=== BLOCK 5: OVERDUE DERIVATION ==="

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"dueDate\":\"2020-01-01\",\"items\":[{\"description\":\"Old unpaid service\",\"quantity\":1,\"unitPriceCents\":2000}]}")
check "5a invoice with past due_date shows overdue" "$R" "\"effective_status\":\"overdue\""

R=$(curl -s "$BASE/api/invoices?status=overdue" -H "Authorization: Bearer $BOSASO_ADMIN")
check "5b overdue filter returns the overdue invoice" "$R" "\"total_cents\":2000"

echo "=== BLOCK 6: TENANT ISOLATION ==="

R=$(curl -s "$BASE/api/invoices/$INV1_ID" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "6a Puntland cannot fetch Bosaso's invoice" "$R" "INVOICE_NOT_FOUND"

R=$(curl -s "$BASE/api/invoices" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "6b Puntland's invoice list is empty (no cross-tenant leakage)" "$R" "\"invoices\":\[\]"

echo "=== BLOCK 7: STATS ==="

R=$(curl -s "$BASE/api/invoices/stats" -H "Authorization: Bearer $BOSASO_ADMIN")
check "7a stats endpoint returns collection rate" "$R" "collectionRate"

echo "=== BLOCK 8: PERMISSION LAYERING RE-USE (new key plugs into Step 12 system) ==="

curl -s -X PATCH "$BASE/api/permissions" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"role":"EMPLOYEE","permissionKey":"MANAGE_INVOICES","allowed":true}' > /dev/null

R=$(curl -s -X POST "$BASE/api/invoices" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"branchId\":\"$BOSASO_MAIN_BRANCH\",\"dueDate\":\"2026-12-31\",\"items\":[{\"description\":\"Employee-issued invoice\",\"quantity\":1,\"unitPriceCents\":500}]}")
check "8a EMPLOYEE can create invoices after tenant override grants MANAGE_INVOICES" "$R" "Invoice created"

echo "=== BLOCK 9: DATABASE INTEGRITY ==="

ITEM_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM invoice_items;" 2>/dev/null | tr -d ' \n')
[ "$ITEM_COUNT" -ge "5" ] && { echo "  PASS: 9a invoice_items persisted ($ITEM_COUNT rows)"; PASS=$((PASS+1)); } \
                          || { echo "  FAIL: 9a invoice_items persisted (got $ITEM_COUNT)"; FAIL=$((FAIL+1)); }

AUDIT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM auth_audit_log WHERE action IN ('INVOICE_CREATED','INVOICE_PAID','INVOICE_VOIDED');" 2>/dev/null | tr -d ' \n')
[ "$AUDIT" -ge "3" ] && { echo "  PASS: 9b invoice actions audit-logged ($AUDIT events)"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 9b invoice actions audit-logged (got $AUDIT)"; FAIL=$((FAIL+1)); }

NOTIF=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM notifications WHERE resource_type = 'invoice';" 2>/dev/null | tr -d ' \n')
[ "$NOTIF" -ge "0" ] && { echo "  PASS: 9c invoice notifications table queryable ($NOTIF rows)"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 9c invoice notifications table queryable"; FAIL=$((FAIL+1)); }

kill $SRV 2>/dev/null

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"
[ "$FAIL" -eq 0 ]
