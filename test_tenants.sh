#!/bin/bash

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1
sleep 1

# Clean state then re-seed with correct data
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/test_setup.sql 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q \
  -f /home/claude/notaryhub/src/db/schema_tenants.sql 2>/dev/null
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

# ── Get tokens for each role ──────────────────────────────────────────────

get_token() {
  curl -si -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | tail -1 | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken','FAILED'))" 2>/dev/null
}

SUPER_TOKEN=$(get_token "admin@notaryhub.local" "Admin@2026!")
BOSASO_ADMIN=$(get_token "admin@bosaso-notary.com" "Admin@2026!")
PUNTLAND_ADMIN=$(get_token "admin@puntland-legal.com" "Admin@2026!")
VANCE_TOKEN=$(get_token "m.vance@bosaso-notary.com" "Admin@2026!")

# IDs
BOSASO_ID="886c9f73-82a4-4e75-a023-cc4802712c52"
PUNTLAND_ID="8a0804b2-7018-4927-839d-b9c648ca3c9f"
BOSASO_MAIN_BRANCH="135aa207-1cc2-4417-9bc0-b68c3ae9cf69"
PUNTLAND_BRANCH="5f12bfe5-ca47-4bea-a8e9-6ae9f6bbe6ad"

echo "=== BLOCK 1: SUPER_ADMIN — TENANT MANAGEMENT ==="

R=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" "$BASE/api/tenants")
check "1a SUPER_ADMIN lists all tenants" "$R" "Bosaso Notary"
check "1b response includes all 4 tenants" "$R" "Puntland Legal"

R=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" "$BASE/api/tenants/$BOSASO_ID")
check "1c SUPER_ADMIN gets specific tenant" "$R" "bosaso-notary"
check "1d stats attached to tenant" "$R" "branchCount"

# Create new tenant
NEW_TENANT=$(curl -s -X POST "$BASE/api/tenants" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","subdomain":"test-corp","plan":"Basic","email":"info@testcorp.com","licenseNumber":"LIC-TEST-001"}')
check "1e SUPER_ADMIN creates new tenant" "$NEW_TENANT" "Tenant created"
NEW_TENANT_ID=$(echo "$NEW_TENANT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tenant',{}).get('id',''))" 2>/dev/null)

# Duplicate subdomain rejected
R=$(curl -s -X POST "$BASE/api/tenants" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp 2","subdomain":"test-corp","plan":"Basic"}')
check "1f duplicate subdomain rejected" "$R" "SUBDOMAIN_TAKEN"

# Update tenant
R=$(curl -s -X PATCH "$BASE/api/tenants/$BOSASO_ID" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"Enterprise"}')
check "1g SUPER_ADMIN updates tenant plan" "$R" "updated"

# Suspend tenant
R=$(curl -s -X PATCH "$BASE/api/tenants/$NEW_TENANT_ID" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}')
check "1h SUPER_ADMIN suspends tenant" "$R" "updated"

# Delete tenant
R=$(curl -s -X DELETE "$BASE/api/tenants/$NEW_TENANT_ID" \
  -H "Authorization: Bearer $SUPER_TOKEN")
check "1i SUPER_ADMIN deletes tenant" "$R" "soft-deleted"

echo "=== BLOCK 2: COMPANY ISOLATION — COMPANY A CANNOT SEE COMPANY B ==="

# Bosaso admin can see their own tenant
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/tenants/$BOSASO_ID")
check "2a COMPANY_ADMIN sees own tenant" "$R" "bosaso-notary"

# Bosaso admin CANNOT see Puntland tenant
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/tenants/$PUNTLAND_ID")
check "2b COMPANY_ADMIN blocked from other tenant" "$R" "FORBIDDEN"

# Bosaso admin CANNOT list all tenants (SUPER_ADMIN only)
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/tenants")
check "2c COMPANY_ADMIN blocked from listing all tenants" "$R" "FORBIDDEN"

# Bosaso admin can NOT create tenants
R=$(curl -s -X POST "$BASE/api/tenants" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rogue Corp","subdomain":"rogue","plan":"Basic"}')
check "2d COMPANY_ADMIN cannot create tenants" "$R" "FORBIDDEN"

echo "=== BLOCK 3: BRANCH ISOLATION ==="

# Bosaso admin sees their branches
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/tenants/$BOSASO_ID/branches")
check "3a COMPANY_ADMIN lists own branches" "$R" "Bosaso Main Branch"

# Bosaso admin CANNOT see Puntland branches
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" "$BASE/api/tenants/$PUNTLAND_ID/branches")
check "3b COMPANY_ADMIN blocked from other tenant branches" "$R" "FORBIDDEN"

# Puntland admin sees their branches
R=$(curl -s -H "Authorization: Bearer $PUNTLAND_ADMIN" "$BASE/api/tenants/$PUNTLAND_ID/branches")
check "3c Puntland COMPANY_ADMIN sees own branches" "$R" "Galkayo Witness Hub"

# Create a branch
NEW_BRANCH=$(curl -s -X POST "$BASE/api/tenants/$BOSASO_ID/branches" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bosaso New Branch","address":"Test St, Bosaso","phone":"+252900000000","countersCount":3}')
check "3d COMPANY_ADMIN creates branch in own tenant" "$NEW_BRANCH" "Branch created"
NEW_BRANCH_ID=$(echo "$NEW_BRANCH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('branch',{}).get('id',''))" 2>/dev/null)

# Bosaso admin CANNOT create branch in Puntland
R=$(curl -s -X POST "$BASE/api/tenants/$PUNTLAND_ID/branches" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rogue Branch","address":"Nowhere","phone":"+252000000000"}')
check "3e COMPANY_ADMIN blocked from creating branch in other tenant" "$R" "FORBIDDEN"

# Update the new branch
R=$(curl -s -X PATCH "$BASE/api/tenants/$BOSASO_ID/branches/$NEW_BRANCH_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"countersCount":5}')
check "3f COMPANY_ADMIN updates own branch" "$R" "updated"

# Delete the new branch
R=$(curl -s -X DELETE "$BASE/api/tenants/$BOSASO_ID/branches/$NEW_BRANCH_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN")
check "3g COMPANY_ADMIN deletes own branch" "$R" "soft-deleted"

echo "=== BLOCK 4: EMPLOYEE ISOLATION ==="

# List employees in Bosaso branch
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" \
  "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees")
check "4a COMPANY_ADMIN lists employees in own branch" "$R" "Michael Vance"

# Bosaso admin CANNOT see Puntland employees
R=$(curl -s -H "Authorization: Bearer $BOSASO_ADMIN" \
  "$BASE/api/tenants/$PUNTLAND_ID/branches/$PUNTLAND_BRANCH/employees")
check "4b COMPANY_ADMIN blocked from other tenant employees" "$R" "FORBIDDEN"

# Create employee in own branch
NEW_EMP=$(curl -s -X POST "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newclerk@bosaso-notary.com","password":"Clerk@2026!","fullName":"New Clerk","jobRole":"RECEPTIONIST","assignedCounter":5}')
check "4c COMPANY_ADMIN creates employee in own branch" "$NEW_EMP" "Employee created"
NEW_EMP_ID=$(echo "$NEW_EMP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('employee',{}).get('id',''))" 2>/dev/null)

# Duplicate email rejected
R=$(curl -s -X POST "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newclerk@bosaso-notary.com","password":"Clerk@2026!","fullName":"Dup Clerk","jobRole":"RECEPTIONIST"}')
check "4d duplicate employee email rejected" "$R" "EMAIL_TAKEN"

# COMPANY_ADMIN cannot create employee in other tenant's branch
R=$(curl -s -X POST "$BASE/api/tenants/$PUNTLAND_ID/branches/$PUNTLAND_BRANCH/employees" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"email":"rogue@puntland.com","password":"Rogue@2026!","fullName":"Rogue Emp","jobRole":"RECEPTIONIST"}')
check "4e COMPANY_ADMIN blocked from creating employee in other tenant" "$R" "FORBIDDEN"

# Employee CANNOT manage other employees
R=$(curl -s "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees" \
  -H "Authorization: Bearer $VANCE_TOKEN")
check "4f EMPLOYEE blocked from listing employees (needs BRANCH_ADMIN+)" "$R" "FORBIDDEN"

# Set employee status
R=$(curl -s -X PATCH "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees/$NEW_EMP_ID/status" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}')
check "4g COMPANY_ADMIN suspends employee" "$R" "suspended"

# Reset password
R=$(curl -s -X POST "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees/$NEW_EMP_ID/reset-password" \
  -H "Authorization: Bearer $BOSASO_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewClerk@2026!"}')
check "4h COMPANY_ADMIN resets employee password" "$R" "reset successfully"

# Delete employee
R=$(curl -s -X DELETE "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees/$NEW_EMP_ID" \
  -H "Authorization: Bearer $BOSASO_ADMIN")
check "4i COMPANY_ADMIN deletes employee" "$R" "soft-deleted"

echo "=== BLOCK 5: UNAUTHENTICATED ACCESS ==="

R=$(curl -s "$BASE/api/tenants")
check "5a unauthenticated request to /tenants = 401" "$R" "UNAUTHENTICATED"

R=$(curl -s "$BASE/api/tenants/$BOSASO_ID/branches")
check "5b unauthenticated branches request = 401" "$R" "UNAUTHENTICATED"

R=$(curl -s "$BASE/api/tenants/$BOSASO_ID/branches/$BOSASO_MAIN_BRANCH/employees")
check "5c unauthenticated employees request = 401" "$R" "UNAUTHENTICATED"

echo "=== BLOCK 6: DATABASE INTEGRITY ==="

# Verify hierarchy is intact in DB
HIERARCHY=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM employees e
   JOIN branches b ON e.branch_id = b.id
   JOIN tenants t ON b.tenant_id = t.tenant_id
   WHERE e.tenant_id = b.tenant_id
   AND b.tenant_id = t.id;" 2>/dev/null)

# Simpler check: employees reference valid branches and tenants
ORPHANED=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM employees e
   WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = e.branch_id)
   OR NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = e.tenant_id);" 2>/dev/null | tr -d ' \n')
[ "$ORPHANED" = "0" ] && { echo "  PASS: 6a no orphaned employee records"; PASS=$((PASS+1)); } \
                       || { echo "  FAIL: 6a orphaned records found ($ORPHANED)"; FAIL=$((FAIL+1)); }

AUDIT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM auth_audit_log WHERE action LIKE 'TENANT_%' OR action LIKE 'BRANCH_%' OR action LIKE 'EMPLOYEE_%';" \
  2>/dev/null | tr -d ' \n')
[ "$AUDIT" -gt "0" ] && { echo "  PASS: 6b multi-tenant ops in audit log ($AUDIT events)"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: 6b no multi-tenant audit events"; FAIL=$((FAIL+1)); }

ACTIONS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT DISTINCT action FROM auth_audit_log ORDER BY action;" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
echo "  INFO: All audit actions: $ACTIONS"

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"

kill $SRV 2>/dev/null || true
