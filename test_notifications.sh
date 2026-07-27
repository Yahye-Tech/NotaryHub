#!/bin/bash
set -e

# Ensure postgres is running
pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

DB="PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q"

# Clean state from previous runs
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test-notif%');
  DELETE FROM appointments WHERE customer_name = 'Test Notif Customer';
  DELETE FROM queue_tickets WHERE customer_name = 'Test Notif Customer';
  DELETE FROM documents WHERE title = 'Test POA Document';
  DELETE FROM customers WHERE email LIKE '%test-notif%';
  DELETE FROM users WHERE email LIKE '%test-notif%';
" 2>/dev/null
echo "DB cleaned."

# Start server
cd /home/claude/NotaryHub
NODE_ENV=production API_ONLY=true TEST_SKIP_RATE_LIMIT=true TEST_SKIP_EMAIL_INIT=true \
  DATABASE_URL="postgresql://notaryhub:notaryhub_dev_2026@127.0.0.1:5432/notaryhub" \
  JWT_ACCESS_SECRET="test_access_secret" JWT_REFRESH_SECRET="test_refresh_secret" \
  npx tsx server.ts > /tmp/srv_notif.log 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  sleep 1
  curl -sf --max-time 1 http://localhost:3000/api/health > /dev/null 2>&1 && break
done

BASE="http://localhost:3000/api"
TENANT_ID="886c9f73-82a4-4e75-a023-cc4802712c52"
BRANCH_ID="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"
PASS=0; FAIL=0

check() {
  if echo "$2" | grep -q "$3"; then
    echo "  PASS: $1"; PASS=$((PASS+1))
  else
    echo "  FAIL: $1"; echo "    expected: $3"; echo "    got:      $2"; FAIL=$((FAIL+1))
  fi
}

# ── BLOCK 1: BRANCH ADMIN BASELINE ─────────────────────────────────────────
echo "=== BLOCK 1: BRANCH ADMIN BASELINE ==="
BRANCH_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"supervisor@bosaso-main.com","password":"Admin@2026!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
[ -n "$BRANCH_TOKEN" ] && { echo "  PASS: 1a branch admin login"; PASS=$((PASS+1)); } \
                        || { echo "  FAIL: 1a branch admin login"; FAIL=$((FAIL+1)); }

R=$(curl -s "$BASE/notifications" -H "Authorization: Bearer $BRANCH_TOKEN")
check "1b GET /api/notifications returns shape" "$R" "unreadCount"

# ── BLOCK 2: CUSTOMER SELF-BOOKING NOTIFIES BRANCH ADMIN ──────────────────
echo "=== BLOCK 2: APPOINTMENT NOTIFICATIONS ==="
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"test-notif.customer@example.com\",\"password\":\"TestPass@2026!\",\"fullName\":\"Test Notif Customer\",\"role\":\"CUSTOMER\",\"tenantId\":\"$TENANT_ID\"}" > /dev/null

PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c \
  "UPDATE users SET email_verified = TRUE WHERE email = 'test-notif.customer@example.com';" 2>/dev/null

CUSTOMER_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"test-notif.customer@example.com","password":"TestPass@2026!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
[ -n "$CUSTOMER_TOKEN" ] && { echo "  PASS: 2a customer login"; PASS=$((PASS+1)); } \
                          || { echo "  FAIL: 2a customer login"; FAIL=$((FAIL+1)); }

START_TIME=$(date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v+1d +"%Y-%m-%dT%H:%M:%S.000Z")
APPT_RESP=$(curl -s -X POST "$BASE/appointments" -H "Authorization: Bearer $CUSTOMER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BRANCH_ID\",\"customerName\":\"Test Notif Customer\",\"serviceType\":\"Document Notarization\",\"startTime\":\"$START_TIME\"}")
check "2b appointment created" "$APPT_RESP" "Appointment created"
APPT_ID=$(echo "$APPT_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('appointment',{}).get('id',''))" 2>/dev/null)
CUSTOMER_ID=$(echo "$APPT_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('appointment',{}).get('customer_id',''))" 2>/dev/null)

sleep 1
BRANCH_NOTIFS=$(curl -s "$BASE/notifications" -H "Authorization: Bearer $BRANCH_TOKEN")
check "2c branch admin notified of new booking" "$BRANCH_NOTIFS" "New appointment booked"

NOTIF_ID=$(echo "$BRANCH_NOTIFS" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['notifications'][0]['id'] if d.get('notifications') else '')" 2>/dev/null)
if [ -n "$NOTIF_ID" ]; then
  R=$(curl -s -X PATCH "$BASE/notifications/$NOTIF_ID/read" -H "Authorization: Bearer $BRANCH_TOKEN")
  check "2d mark single notification read" "$R" '"is_read":true'
fi

# Branch admin confirms -> customer notified (proves customers.user_id linkage works)
curl -s -X POST "$BASE/appointments/$APPT_ID/transition" -H "Authorization: Bearer $BRANCH_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' > /dev/null
sleep 1
CUSTOMER_NOTIFS=$(curl -s "$BASE/notifications" -H "Authorization: Bearer $CUSTOMER_TOKEN")
check "2e customer notified of confirmation (user_id link works)" "$CUSTOMER_NOTIFS" "Appointment confirmed"

R=$(curl -s -X POST "$BASE/notifications/read-all" -H "Authorization: Bearer $BRANCH_TOKEN")
check "2f mark-all-read works" "$R" "marked read"

# ── BLOCK 3: DOCUMENT TRANSITION NOTIFICATIONS ─────────────────────────────
echo "=== BLOCK 3: DOCUMENT NOTIFICATIONS ==="
EMPLOYEE_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"e.rostova@bosaso-notary.com","password":"Admin@2026!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

DOC_RESP=$(curl -s -X POST "$BASE/documents" -H "Authorization: Bearer $EMPLOYEE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BRANCH_ID\",\"customerId\":\"$CUSTOMER_ID\",\"title\":\"Test POA Document\",\"docType\":\"POWER_OF_ATTORNEY\",\"content\":\"Test content for e2e verification.\"}")
check "3a document created" "$DOC_RESP" "Document created"
DOC_ID=$(echo "$DOC_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('document',{}).get('id',''))" 2>/dev/null)

curl -s -X POST "$BASE/documents/$DOC_ID/transition" -H "Authorization: Bearer $EMPLOYEE_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"pending_review"}' > /dev/null
sleep 1
BRANCH_NOTIFS2=$(curl -s "$BASE/notifications" -H "Authorization: Bearer $BRANCH_TOKEN")
check "3b branch admin notified doc needs review" "$BRANCH_NOTIFS2" "Document needs review"

curl -s -X POST "$BASE/documents/$DOC_ID/transition" -H "Authorization: Bearer $BRANCH_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"approved"}' > /dev/null
sleep 1
CUSTOMER_NOTIFS2=$(curl -s "$BASE/notifications" -H "Authorization: Bearer $CUSTOMER_TOKEN")
check "3c customer notified of document approval" "$CUSTOMER_NOTIFS2" "Document approved"

# ── BLOCK 4: QUEUE CALL-NEXT NOTIFICATION ──────────────────────────────────
echo "=== BLOCK 4: QUEUE NOTIFICATIONS ==="
CHECKIN_RESP=$(curl -s -X POST "$BASE/queue/check-in" -H "Authorization: Bearer $EMPLOYEE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BRANCH_ID\",\"customerId\":\"$CUSTOMER_ID\",\"customerName\":\"Test Notif Customer\",\"serviceType\":\"Document Notarization\"}")
check "4a queue check-in" "$CHECKIN_RESP" "Customer checked in"

curl -s -X POST "$BASE/queue/call-next" -H "Authorization: Bearer $EMPLOYEE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"branchId\":\"$BRANCH_ID\",\"counter\":1}" > /dev/null
sleep 1
CUSTOMER_NOTIFS3=$(curl -s "$BASE/notifications" -H "Authorization: Bearer $CUSTOMER_TOKEN")
check "4b customer notified when called to counter" "$CUSTOMER_NOTIFS3" "You've been called"

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"

kill $SRV 2>/dev/null || true
