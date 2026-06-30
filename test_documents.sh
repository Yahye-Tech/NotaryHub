#!/bin/bash

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

# Clean + re-seed
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_tenants.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_full.sql 2>/dev/null
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
    echo "  FAIL: $1"; echo "    expected: $3"; echo "    got: $2"; FAIL=$((FAIL+1))
  fi
}

get_token() {
  curl -si -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | tail -1 | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken','FAILED'))" 2>/dev/null
}

BOSASO_ADMIN=$(get_token "admin@bosaso-notary.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")
BOSASO_BRANCH="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"

echo "=== BLOCK 1: CUSTOMER CRUD (Layer 2) ==="

R=$(curl -s -X POST "$BASE/api/customers" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"fullName":"Test Customer One","email":"testcust1@example.com","phone":"+252611112222","idType":"NATIONAL_ID","idNumber":"SO-TEST-001"}')
check "1a create customer" "$R" "Test Customer One"
CUST_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['customer']['id'])" 2>/dev/null)

R=$(curl -s -X POST "$BASE/api/customers" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"fullName":"Dup","email":"testcust1@example.com"}')
check "1b duplicate email rejected" "$R" "EMAIL_TAKEN"

R=$(curl -s "$BASE/api/customers" -H "Authorization: Bearer $BOSASO_ADMIN")
check "1c list customers" "$R" "Test Customer One"

R=$(curl -s "$BASE/api/customers/$CUST_ID" -H "Authorization: Bearer $BOSASO_ADMIN")
check "1d get customer by id" "$R" "SO-TEST-001"

R=$(curl -s -X PATCH "$BASE/api/customers/$CUST_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"phone":"+252699998888"}')
check "1e update customer" "$R" "updated"

echo "=== BLOCK 2: DOCUMENT WORKFLOW (Layer 7 backend) ==="

R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_BRANCH\",\"title\":\"POA Test Doc\",\"docType\":\"POWER_OF_ATTORNEY\",\"content\":\"Test content\",\"customerId\":\"$CUST_ID\"}")
check "2a employee creates document" "$R" "POA Test Doc"
check "2b document number generated" "$R" "BOS-2026-"
DOC_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['document']['id'])" 2>/dev/null)
check "2c starts as draft" "$R" '"status":"draft"'

R=$(curl -s "$BASE/api/documents/$DOC_ID" -H "Authorization: Bearer $VANCE_TOKEN")
check "2d get document shows customer name" "$R" "Test Customer One"

# Invalid transition: draft -> notarised directly should fail
# (tested with BOSASO_ADMIN who HAS notarise permission, to isolate the
#  transition-order guard from the role-permission guard)
R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"notarised"}')
check "2e skip-stage transition rejected (authorized role)" "$R" "INVALID_TRANSITION"

# Valid: draft -> pending_review
R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"pending_review"}')
check "2f draft to pending_review" "$R" "pending_review"

# Employee cannot approve (needs BRANCH_ADMIN+)
R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"approved"}')
check "2g employee blocked from approving" "$R" "FORBIDDEN"

# Company admin can approve
R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"approved"}')
check "2h company_admin approves" "$R" '"status":"approved"'

R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"signed"}')
check "2i approved to signed" "$R" '"status":"signed"'
check "2j signed_at timestamp set" "$R" "signed_at"

R=$(curl -s -X POST "$BASE/api/documents/$DOC_ID/transition" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"notarised"}')
check "2k signed to notarised" "$R" '"status":"notarised"'
check "2l seal_code generated" "$R" "NOTARY-SEAL-"

# Cannot edit notarised doc
R=$(curl -s -X PATCH "$BASE/api/documents/$DOC_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"title":"Hacked title"}')
check "2m notarised document locked from edits" "$R" "DOCUMENT_NOT_EDITABLE"

# Cannot delete notarised doc
R=$(curl -s -X DELETE "$BASE/api/documents/$DOC_ID" -H "Authorization: Bearer $BOSASO_ADMIN")
check "2n notarised document protected from delete" "$R" "DOCUMENT_LOCKED"

echo "=== BLOCK 3: REJECTION FLOW ==="

R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_BRANCH\",\"title\":\"Rejectable Doc\",\"docType\":\"AFFIDAVIT\"}")
DOC2_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['document']['id'])" 2>/dev/null)
DOC2_NUM=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['document']['document_number'])" 2>/dev/null)
check "3a second doc gets sequential number" "$DOC2_NUM" "BOS-2026-00000"

R=$(curl -s -X POST "$BASE/api/documents/$DOC2_ID/transition" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"rejected"}')
check "3b reject without reason blocked" "$R" "REJECTION_REASON_REQUIRED"

R=$(curl -s -X POST "$BASE/api/documents/$DOC2_ID/transition" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"rejected","rejectionReason":"Missing witness signature"}')
check "3c reject with reason succeeds" "$R" "Missing witness signature"

R=$(curl -s -X POST "$BASE/api/documents/$DOC2_ID/transition" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"draft"}')
check "3d rejected can reopen as draft" "$R" '"status":"draft"'

echo "=== BLOCK 4: TENANT ISOLATION ==="

PUNTLAND_ADMIN=$(get_token "admin@puntland-legal.com" "Admin@2026!")
R=$(curl -s "$BASE/api/documents/$DOC_ID" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "4a cross-tenant document access blocked" "$R" "NOT_FOUND"

R=$(curl -s "$BASE/api/customers/$CUST_ID" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "4b cross-tenant customer access blocked" "$R" "NOT_FOUND"

echo "=== BLOCK 5: DATABASE INTEGRITY ==="

DOC_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM documents WHERE tenant_id='886c9f73-82a4-4e75-a023-cc4802712c52';" 2>/dev/null)
[ "$DOC_COUNT" -ge "2" ] && { echo "  PASS: 5a documents persisted to DB ($DOC_COUNT rows)"; PASS=$((PASS+1)); } \
                          || { echo "  FAIL: 5a expected >=2, got $DOC_COUNT"; FAIL=$((FAIL+1)); }

CUST_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM customers WHERE id='$CUST_ID';" 2>/dev/null)
[ "$CUST_COUNT" = "1" ] && { echo "  PASS: 5b customer persisted to DB"; PASS=$((PASS+1)); } \
                         || { echo "  FAIL: 5b customer not found in DB"; FAIL=$((FAIL+1)); }

SEAL_CHECK=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT seal_code FROM documents WHERE id='$DOC_ID';" 2>/dev/null)
echo "  INFO: seal_code in DB = $SEAL_CHECK"
[ -n "$SEAL_CHECK" ] && { echo "  PASS: 5c seal_code written to DB"; PASS=$((PASS+1)); } \
                       || { echo "  FAIL: 5c seal_code is empty"; FAIL=$((FAIL+1)); }

AUDIT_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM audit_logs WHERE resource_type='document';" 2>/dev/null)
[ "$AUDIT_COUNT" -gt "0" ] && { echo "  PASS: 5d operational audit_logs written ($AUDIT_COUNT events)"; PASS=$((PASS+1)); } \
                            || { echo "  FAIL: 5d no document audit events"; FAIL=$((FAIL+1)); }

FK_CHECK=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM documents d JOIN customers c ON d.customer_id=c.id WHERE d.id='$DOC_ID';" 2>/dev/null)
[ "$FK_CHECK" = "1" ] && { echo "  PASS: 5e document-customer FK relationship intact"; PASS=$((PASS+1)); } \
                       || { echo "  FAIL: 5e FK join failed"; FAIL=$((FAIL+1)); }


echo "=== BLOCK 6: CUSTOMER HISTORY (Step 8) ==="

R=$(curl -s "$BASE/api/customers/$CUST_ID/history" -H "Authorization: Bearer $BOSASO_ADMIN")
check "6a customer history returns documents array" "$R" '"documents"'
check "6b history shows linked document" "$R" "POA Test Doc"
check "6c history shows real document_number" "$R" "BOS-2026-"

echo "=== BLOCK 7: BLACKLIST ENFORCEMENT (Step 8) ==="

R=$(curl -s -X PATCH "$BASE/api/customers/$CUST_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"blacklisted","blacklistReason":"Test blacklist reason"}')
check "7a customer can be blacklisted" "$R" "blacklisted"

R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_BRANCH\",\"title\":\"Should Fail\",\"docType\":\"DEED\",\"customerId\":\"$CUST_ID\"}")
check "7b blacklisted customer blocked from new documents" "$R" "CUSTOMER_BLACKLISTED"

R=$(curl -s -X PATCH "$BASE/api/customers/$CUST_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN" -H "Content-Type: application/json" \
  -d '{"status":"active"}')
check "7c customer can be restored to active" "$R" '"status":"active"'

R=$(curl -s -X POST "$BASE/api/documents" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BOSASO_BRANCH\",\"title\":\"Should Succeed Now\",\"docType\":\"DEED\",\"customerId\":\"$CUST_ID\"}")
check "7d restored customer can get new documents" "$R" "Should Succeed Now"

echo "=== BLOCK 8: CROSS-TENANT HISTORY ISOLATION ==="

R=$(curl -s "$BASE/api/customers/$CUST_ID/history" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "8a cross-tenant history access blocked" "$R" "NOT_FOUND"


echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"

kill $SRV 2>/dev/null || true
