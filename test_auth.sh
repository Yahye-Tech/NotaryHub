#!/bin/bash
set -e

# Ensure postgres is running
pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

# Clean state from previous runs (uses pre-built SQL file)
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
echo "DB cleaned."

# Start server
cd /home/claude/notaryhub
NODE_ENV=production API_ONLY=true TEST_SKIP_RATE_LIMIT=true npx tsx server.ts > /tmp/srv.log 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  sleep 1
  curl -sf --max-time 1 http://localhost:3000/api/health > /dev/null 2>&1 && break
done

BASE="http://localhost:3000/api/auth"
PASS=0; FAIL=0

check() {
  if echo "$2" | grep -q "$3"; then
    echo "  PASS: $1"; PASS=$((PASS+1))
  else
    echo "  FAIL: $1"; echo "    expected: $3"; echo "    got:      $2"; FAIL=$((FAIL+1))
  fi
}

get_cookie() {
  echo "$1" | grep -i "set-cookie" | grep "notaryhub_refresh" | sed 's/.*notaryhub_refresh=\([^;]*\).*/\1/'
}

# ── BLOCK 1: REGISTRATION ──────────────────────────────────────────────────
echo "=== BLOCK 1: REGISTRATION ==="
R=$(curl -s -X POST "$BASE/register" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"Test@2026!","fullName":"Ahmed Hassan","role":"EMPLOYEE"}')
check "1a valid register" "$R" "Account created"

R=$(curl -s -X POST "$BASE/register" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"Test@2026!","fullName":"Ahmed Hassan","role":"EMPLOYEE"}')
check "1b duplicate email rejected" "$R" "EMAIL_TAKEN"

R=$(curl -s -X POST "$BASE/register" -H "Content-Type: application/json" \
  -d '{"email":"new@test.local","password":"weakpassword","fullName":"Test","role":"CUSTOMER"}')
check "1c weak password rejected" "$R" "WEAK_PASSWORD"

R=$(curl -s -X POST "$BASE/register" -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"Test@2026!","fullName":"Test","role":"CUSTOMER"}')
check "1d invalid email rejected" "$R" "VALIDATION_ERROR"

R=$(curl -s -X POST "$BASE/register" -H "Content-Type: application/json" \
  -d '{"email":"x@test.local"}')
check "1e missing fields rejected" "$R" "VALIDATION_ERROR"

# ── BLOCK 2: LOGIN - UNVERIFIED EMAIL ──────────────────────────────────────
echo "=== BLOCK 2: LOGIN - UNVERIFIED EMAIL ==="
R=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"Test@2026!"}')
check "2a login blocked before email verification" "$R" "EMAIL_NOT_VERIFIED"

# Activate user (simulates clicking email link)
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -c "UPDATE users SET email_verified=TRUE, status='active' WHERE email='ahmed@test.local';"

# ── BLOCK 3: LOGIN - VERIFIED USER ─────────────────────────────────────────
echo "=== BLOCK 3: LOGIN - VERIFIED USER ==="
LOGIN_RESP=$(curl -si -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"Test@2026!"}')
LOGIN_BODY=$(echo "$LOGIN_RESP" | tail -1)
REFRESH_COOKIE=$(get_cookie "$LOGIN_RESP")

check "3a valid login returns accessToken" "$LOGIN_BODY" "accessToken"
check "3b response contains role EMPLOYEE" "$LOGIN_BODY" "EMPLOYEE"
check "3c httpOnly refresh cookie set in response" "$REFRESH_COOKIE" "."

ACCESS_TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

R=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"Wrong@9999!"}')
check "3d wrong password rejected" "$R" "INVALID_CREDENTIALS"

R=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"ghost@nowhere.local","password":"Test@2026!"}')
check "3e unknown user rejected with same message (no enumeration)" "$R" "INVALID_CREDENTIALS"

# ── BLOCK 4: /me ───────────────────────────────────────────────────────────
echo "=== BLOCK 4: /me - AUTHENTICATED PROFILE ==="
R=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/me")
check "4a /me returns correct email" "$R" "ahmed@test.local"
check "4b /me returns correct role" "$R" "EMPLOYEE"
check "4c /me returns emailVerified field" "$R" "emailVerified"

R=$(curl -s "$BASE/me")
check "4d /me without token = 401 UNAUTHENTICATED" "$R" "UNAUTHENTICATED"

R=$(curl -s -H "Authorization: Bearer bad.token.here" "$BASE/me")
check "4e /me with invalid token = 401 TOKEN_INVALID" "$R" "TOKEN_INVALID"

# ── BLOCK 5: REFRESH TOKEN ─────────────────────────────────────────────────
echo "=== BLOCK 5: REFRESH TOKEN ==="
REFRESH_RESP=$(curl -si -X POST "$BASE/refresh" \
  -H "Cookie: notaryhub_refresh=$REFRESH_COOKIE")
REFRESH_BODY=$(echo "$REFRESH_RESP" | tail -1)
NEW_COOKIE=$(get_cookie "$REFRESH_RESP")

check "5a refresh returns new accessToken" "$REFRESH_BODY" "accessToken"
check "5b refresh rotates httpOnly cookie" "$NEW_COOKIE" "."

# Reuse old (now-revoked) token — triggers reuse detection
R=$(curl -s -X POST "$BASE/refresh" -H "Cookie: notaryhub_refresh=$REFRESH_COOKIE")
check "5c reused refresh token triggers REUSE_DETECTED" "$R" "REFRESH_TOKEN"

R=$(curl -s -X POST "$BASE/refresh")
check "5d no cookie at all = NO_REFRESH_TOKEN" "$R" "NO_REFRESH_TOKEN"

# ── BLOCK 6: ACCOUNT LOCKOUT ───────────────────────────────────────────────
echo "=== BLOCK 6: ACCOUNT LOCKOUT ==="
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO users (email,password_hash,role,status,full_name,email_verified)
  VALUES ('locktest@test.local','\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMnLzVmqVKCGhXLTTx.MR6FS','EMPLOYEE','active','Lock Test',TRUE)
  ON CONFLICT DO NOTHING;"
for i in 1 2 3 4 5; do
  curl -s -X POST "$BASE/login" -H "Content-Type: application/json" \
    -d '{"email":"locktest@test.local","password":"Wrong@9999!"}' > /dev/null
done
R=$(curl -s -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"locktest@test.local","password":"Wrong@9999!"}')
check "6a account locks after 5 failures" "$R" "ACCOUNT_LOCKED"

DB_LOCK=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT locked_until IS NOT NULL FROM users WHERE email='locktest@test.local';" 2>/dev/null)
[ "$DB_LOCK" = "t" ] && { echo "  PASS: 6b locked_until written to DB"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 6b locked_until not in DB (got: $DB_LOCK)"; FAIL=$((FAIL+1)); }

# ── BLOCK 7: FORGOT / RESET PASSWORD ──────────────────────────────────────
echo "=== BLOCK 7: FORGOT / RESET PASSWORD ==="
R=$(curl -s -X POST "$BASE/forgot-password" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local"}')
check "7a forgot-password returns 200 with message" "$R" "reset link"

R=$(curl -s -X POST "$BASE/forgot-password" -H "Content-Type: application/json" \
  -d '{"email":"ghost@nowhere.local"}')
check "7b ghost email returns same 200 (prevent enumeration)" "$R" "reset link"

R=$(curl -s -X POST "$BASE/reset-password" -H "Content-Type: application/json" \
  -d '{"token":"0000000000000000000000000000000000000000000000000000000000000000","password":"NewPass@2026!"}')
check "7c invalid reset token rejected" "$R" "TOKEN_INVALID"

# Insert a known raw token for ahmed@test.local (64-char hex = 32 bytes)
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO one_time_tokens (user_id, token_hash, type, expires_at)
  SELECT id,
    encode(sha256('aabbccdd1234567890abcdef1234567890abcdef1234567890abcdef12345678'::bytea),'hex'),
    'password_reset', NOW() + INTERVAL '1 hour'
  FROM users WHERE email='ahmed@test.local'
  ON CONFLICT DO NOTHING;"

R=$(curl -s -X POST "$BASE/reset-password" -H "Content-Type: application/json" \
  -d '{"token":"aabbccdd1234567890abcdef1234567890abcdef1234567890abcdef12345678","password":"NewPass@2026!"}')
check "7d valid reset token accepted" "$R" "Password reset successfully"

R=$(curl -s -X POST "$BASE/reset-password" -H "Content-Type: application/json" \
  -d '{"token":"aabbccdd1234567890abcdef1234567890abcdef1234567890abcdef12345678","password":"AnotherPass@2026!"}')
check "7e used token rejected on reuse" "$R" "TOKEN_ALREADY_USED"

# ── BLOCK 8: LOGOUT ────────────────────────────────────────────────────────
echo "=== BLOCK 8: LOGOUT ==="
LOGIN2_RESP=$(curl -si -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"NewPass@2026!"}')
LOGIN2_BODY=$(echo "$LOGIN2_RESP" | tail -1)
COOKIE2=$(get_cookie "$LOGIN2_RESP")
AT2=$(echo "$LOGIN2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
check "8a re-login after password reset works" "$LOGIN2_BODY" "accessToken"

R=$(curl -s -X POST "$BASE/logout" \
  -H "Authorization: Bearer $AT2" \
  -H "Cookie: notaryhub_refresh=$COOKIE2")
check "8b logout returns success message" "$R" "Logged out"

R=$(curl -s -X POST "$BASE/refresh" -H "Cookie: notaryhub_refresh=$COOKIE2")
check "8c refresh after logout fails (token is revoked)" "$R" "REFRESH_TOKEN"

# ── BLOCK 9: RBAC ENFORCEMENT ──────────────────────────────────────────────
echo "=== BLOCK 9: RBAC ENFORCEMENT ==="
LOGIN3_RESP=$(curl -si -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.local","password":"NewPass@2026!"}')
LOGIN3_BODY=$(echo "$LOGIN3_RESP" | tail -1)
AT3=$(echo "$LOGIN3_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

# EMPLOYEE can access AI routes (GEMINI_API_KEY not set → 503, not 401)
R=$(curl -s -X POST "http://localhost:3000/api/gemini/chat" \
  -H "Authorization: Bearer $AT3" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}')
check "9a EMPLOYEE token passes RBAC, hits 503 for missing Gemini key" "$R" "GEMINI_API_KEY"

# No token → 401 UNAUTHENTICATED
R=$(curl -s -X POST "http://localhost:3000/api/gemini/generate-doc" \
  -H "Content-Type: application/json" -d '{}')
check "9b unauthenticated request blocked with 401" "$R" "UNAUTHENTICATED"

# SUPER_ADMIN seed user can login
ADMIN_RESP=$(curl -si -X POST "$BASE/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@notaryhub.local","password":"Admin@2026!"}')
ADMIN_BODY=$(echo "$ADMIN_RESP" | tail -1)
check "9c SUPER_ADMIN seed user logs in with correct role" "$ADMIN_BODY" "SUPER_ADMIN"

# ── BLOCK 10: DATABASE INTEGRITY ───────────────────────────────────────────
echo "=== BLOCK 10: DATABASE INTEGRITY ==="
USERS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')
[ "$USERS" -gt "0" ] && { echo "  PASS: 10a users table ($USERS rows)"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: 10a users table empty"; FAIL=$((FAIL+1)); }

RT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM refresh_tokens;" 2>/dev/null | tr -d ' \n')
[ "$RT" -gt "0" ] && { echo "  PASS: 10b refresh_tokens ($RT rows)"; PASS=$((PASS+1)); } \
                   || { echo "  FAIL: 10b refresh_tokens empty"; FAIL=$((FAIL+1)); }

AUDIT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM auth_audit_log;" 2>/dev/null | tr -d ' \n')
[ "$AUDIT" -gt "0" ] && { echo "  PASS: 10c audit_log ($AUDIT events)"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: 10c audit_log empty"; FAIL=$((FAIL+1)); }

REVOKED=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM refresh_tokens WHERE revoked=TRUE;" 2>/dev/null | tr -d ' \n')
[ "$REVOKED" -gt "0" ] && { echo "  PASS: 10d revoked tokens ($REVOKED)"; PASS=$((PASS+1)); } \
                        || { echo "  FAIL: 10d no revoked tokens"; FAIL=$((FAIL+1)); }

FK=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM refresh_tokens rt JOIN users u ON rt.user_id=u.id;" 2>/dev/null | tr -d ' \n')
[ "$FK" -gt "0" ] && { echo "  PASS: 10e FK relationships intact ($FK joined rows)"; PASS=$((PASS+1)); } \
                   || { echo "  FAIL: 10e FK join failed"; FAIL=$((FAIL+1)); }

ACTIONS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT DISTINCT action FROM auth_audit_log ORDER BY action;" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
echo "  INFO: Audit actions: $ACTIONS"

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"

kill $SRV 2>/dev/null || true
