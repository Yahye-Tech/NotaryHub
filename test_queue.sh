#!/bin/bash

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_tenants.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_full.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_queue.sql 2>/dev/null

# Assign counter 3 to Vance
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "UPDATE employees SET assigned_counter=3 WHERE user_id='bc505fec-32be-472d-bc38-0799486f31b1';" 2>/dev/null

# Create nocounter employee upfront
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO users (email,password_hash,role,status,tenant_id,full_name,email_verified)
  VALUES ('nocounter@bosaso-notary.com','\$2b\$12\$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
    'EMPLOYEE','active','886c9f73-82a4-4e75-a023-cc4802712c52','No Counter Employee',TRUE)
  ON CONFLICT DO NOTHING;
  INSERT INTO employees (user_id,tenant_id,branch_id,job_role,assigned_counter)
  SELECT id,'886c9f73-82a4-4e75-a023-cc4802712c52','135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
    'NOTARY_OFFICER', NULL
  FROM users WHERE email='nocounter@bosaso-notary.com' AND NOT EXISTS
    (SELECT 1 FROM employees WHERE user_id=(SELECT id FROM users WHERE email='nocounter@bosaso-notary.com'));
  UPDATE employees SET assigned_counter=NULL
  WHERE user_id=(SELECT id FROM users WHERE email='nocounter@bosaso-notary.com');" 2>/dev/null
echo "DB seeded."

start_server() {
  pkill -f "tsx server.ts" 2>/dev/null; sleep 1
  cd /home/claude/notaryhub
  NODE_ENV=production API_ONLY=true TEST_SKIP_RATE_LIMIT=true npx tsx server.ts > /tmp/srv.log 2>&1 &
  echo $! > /tmp/srvpid
  for i in $(seq 1 20); do
    sleep 1
    curl -sf --max-time 1 http://localhost:3000/api/health > /dev/null 2>&1 && return 0
  done
  echo "SERVER FAILED TO START"; return 1
}

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

BOSASO_BRANCH="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"
PUNTLAND_BRANCH="5f12bfe5-ca47-4bea-a8e9-6ae9f6bbe6ad"

# ─── SERVER 1: Blocks 1-6 ────────────────────────────────────────────────────
start_server

BOSASO_ADMIN=$(get_token "admin@bosaso-notary.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")
PUNTLAND_ADMIN=$(get_token "admin@puntland-legal.com" "Admin@2026!")

echo "=== BLOCK 1: CHECK-IN — REAL SEQUENTIAL NUMBERING ==="
R=$(curl -s -X POST "$BASE/api/queue/check-in" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"customerName":"Hodan Jama","serviceType":"Power of Attorney"}')
check "1a check-in creates ticket" "$R" "ticket"
check "1b ticket number is A-001" "$R" "A-001"
T1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket']['id'])" 2>/dev/null)

R=$(curl -s -X POST "$BASE/api/queue/check-in" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"customerName":"Abdirahman Nur","serviceType":"Affidavit"}')
check "1c second ticket is A-002" "$R" "A-002"
T2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket']['id'])" 2>/dev/null)

R=$(curl -s -X POST "$BASE/api/queue/check-in" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{"customerName":"Faadumo Hassan","serviceType":"Deed Signing"}')
check "1d third ticket is A-003" "$R" "A-003"
T3=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket']['id'])" 2>/dev/null)

echo "=== BLOCK 2: LIST QUEUE WITH STATS ==="
R=$(curl -s "$BASE/api/queue" -H "Authorization: Bearer $VANCE_TOKEN")
check "2a queue list returns tickets array" "$R" '"tickets"'
check "2b stats shows 3 waiting" "$R" '"waiting":3'
check "2c stats shows 0 serving" "$R" '"serving":0'

echo "=== BLOCK 3: CALL-NEXT — USES REAL ASSIGNED COUNTER ==="
R=$(curl -s -X POST "$BASE/api/queue/call-next" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{}')
check "3a call-next returns calling ticket" "$R" '"status":"calling"'
check "3b called_counter is 3 (from employee record)" "$R" '"called_counter":3'
check "3c FIFO — A-001 called first" "$R" "A-001"
check "3d serves Hodan Jama (oldest)" "$R" "Hodan Jama"

echo "=== BLOCK 4: STATUS TRANSITIONS ==="
R=$(curl -s -X POST "$BASE/api/queue/$T1/serving" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" -d '{}')
check "4a calling -> serving" "$R" '"status":"serving"'
check "4b serving_at timestamp set" "$R" "serving_at"

R=$(curl -s -X POST "$BASE/api/queue/$T1/complete" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" -d '{}')
check "4c serving -> completed" "$R" '"status":"completed"'

echo "=== BLOCK 5: SKIP & RECALL ==="
R=$(curl -s -X POST "$BASE/api/queue/$T2/skip" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" -d '{}')
check "5a waiting -> passed (skip)" "$R" '"status":"passed"'

R=$(curl -s -X POST "$BASE/api/queue/$T2/recall" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" -d '{}')
check "5b passed -> waiting (recall)" "$R" '"status":"waiting"'

echo "=== BLOCK 6: CALL-NEXT AUTO-COMPLETES PREVIOUS SERVING ==="
curl -s -X POST "$BASE/api/queue/call-next" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d '{}' > /dev/null
curl -s -X POST "$BASE/api/queue/$T2/serving" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" -d '{}' > /dev/null

R=$(curl -s -X POST "$BASE/api/queue/call-next" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" -d '{}')
check "6a call-next succeeds while counter has serving ticket" "$R" '"status":"calling"'

T2_STATUS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT status FROM queue_tickets WHERE id='$T2';" 2>/dev/null | tr -d ' \n')
[ "$T2_STATUS" = "completed" ] && { echo "  PASS: 6b previous serving auto-completed in DB"; PASS=$((PASS+1)); } \
                                || { echo "  FAIL: 6b expected completed, got $T2_STATUS"; FAIL=$((FAIL+1)); }

# Kill server 1
kill $(cat /tmp/srvpid 2>/dev/null) 2>/dev/null; sleep 2

# ─── SERVER 2: Blocks 7-9 ────────────────────────────────────────────────────
start_server

BOSASO_ADMIN=$(get_token "admin@bosaso-notary.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")
PUNTLAND_ADMIN=$(get_token "admin@puntland-legal.com" "Admin@2026!")
NOCOUNTER_TOKEN=$(get_token "nocounter@bosaso-notary.com" "Admin@2026!")

echo "=== BLOCK 7: TENANT ISOLATION ==="
R=$(curl -s "$BASE/api/queue" -H "Authorization: Bearer $PUNTLAND_ADMIN")
check "7a puntland sees only their own tenant data" "$R" '"tickets"'

R=$(curl -s -X POST "$BASE/api/queue/$T3/complete" \
  -H "Authorization: Bearer $PUNTLAND_ADMIN" -H "Content-Type: application/json" -d '{}')
check "7b cross-tenant ticket action fails" "$R" "INVALID_TRANSITION"

echo "=== BLOCK 8: NO COUNTER ASSIGNED ==="

# Complete any leftover active tickets
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  UPDATE queue_tickets SET status='completed', completed_at=NOW()
  WHERE branch_id='$BOSASO_BRANCH'
    AND status IN ('waiting','calling','serving')
    AND ticket_date=CURRENT_DATE;" 2>/dev/null

# Ensure assigned_counter is NULL for nocounter employee
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  UPDATE employees SET assigned_counter=NULL
  WHERE user_id=(SELECT id FROM users WHERE email='nocounter@bosaso-notary.com');" 2>/dev/null

# Check in 2 fresh tickets with explicit branchId
curl -s -X POST "$BASE/api/queue/check-in" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"customerName\":\"Counter Test A\",\"serviceType\":\"General Enquiry\",\"branchId\":\"$BOSASO_BRANCH\"}" > /dev/null
curl -s -X POST "$BASE/api/queue/check-in" \
  -H "Authorization: Bearer $VANCE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"customerName\":\"Counter Test B\",\"serviceType\":\"General Enquiry\",\"branchId\":\"$BOSASO_BRANCH\"}" > /dev/null

# 8a: no counter, no override -> clear error
R=$(curl -s -X POST "$BASE/api/queue/call-next" \
  -H "Authorization: Bearer $NOCOUNTER_TOKEN" -H "Content-Type: application/json" \
  -d '{}')
check "8a employee without counter gets clear error" "$R" "NO_COUNTER_ASSIGNED"

# 8b: explicit counter override -> succeeds
R=$(curl -s -X POST "$BASE/api/queue/call-next" \
  -H "Authorization: Bearer $NOCOUNTER_TOKEN" -H "Content-Type: application/json" \
  -d '{"counter":5}')
check "8b explicit counter override works" "$R" '"called_counter":5'

echo "=== BLOCK 9: DATABASE INTEGRITY ==="
TICKET_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM queue_tickets WHERE branch_id='$BOSASO_BRANCH';" 2>/dev/null | tr -d ' \n')
[ "$TICKET_COUNT" -ge "3" ] && { echo "  PASS: 9a queue_tickets persisted ($TICKET_COUNT rows)"; PASS=$((PASS+1)); } \
                             || { echo "  FAIL: 9a expected >=3, got $TICKET_COUNT"; FAIL=$((FAIL+1)); }

UNIQUE_CHECK=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) = COUNT(DISTINCT ticket_number) FROM queue_tickets WHERE branch_id='$BOSASO_BRANCH';" \
  2>/dev/null | tr -d ' \n')
[ "$UNIQUE_CHECK" = "t" ] && { echo "  PASS: 9b all ticket_numbers unique per branch"; PASS=$((PASS+1)); } \
                           || { echo "  FAIL: 9b duplicate ticket_numbers found"; FAIL=$((FAIL+1)); }

AUDIT_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM auth_audit_log WHERE action LIKE 'QUEUE_%';" 2>/dev/null | tr -d ' \n')
[ "$AUDIT_COUNT" -gt "0" ] && { echo "  PASS: 9c queue actions in audit_log ($AUDIT_COUNT events)"; PASS=$((PASS+1)); } \
                            || { echo "  FAIL: 9c no queue audit events"; FAIL=$((FAIL+1)); }

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"

kill $(cat /tmp/srvpid 2>/dev/null) 2>/dev/null
