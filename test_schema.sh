#!/bin/bash

pg_isready -h 127.0.0.1 > /dev/null 2>&1 || pg_ctlcluster 16 main start > /dev/null 2>&1

DB="PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub"
PASS=0; FAIL=0

check() {
  if echo "$2" | grep -q "$3"; then
    echo "  PASS: $1"; PASS=$((PASS+1))
  else
    echo "  FAIL: $1"; echo "    expected: $3"; echo "    got:      $2"; FAIL=$((FAIL+1))
  fi
}

check_count() {
  local name="$1" table="$2" expected="$3"
  local got=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
    "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' \n')
  if [ "$got" -ge "$expected" ]; then
    echo "  PASS: $name ($got rows)"; PASS=$((PASS+1))
  else
    echo "  FAIL: $name (expected >=$expected, got $got)"; FAIL=$((FAIL+1))
  fi
}

check_fk() {
  local name="$1" table="$2" col="$3" ref_table="$4"
  local got=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
    SELECT COUNT(*) FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name='$table' AND kcu.column_name='$col';" 2>/dev/null | tr -d ' \n')
  [ "$got" -gt "0" ] && { echo "  PASS: $name"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: $name (FK not found)"; FAIL=$((FAIL+1)); }
}

echo "=== BLOCK 1: ALL 14 TABLES EXIST ==="
for tbl in tenants users branches employees company_profiles customers documents \
           subscriptions payments audit_logs notifications \
           auth_audit_log refresh_tokens one_time_tokens; do
  R=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
    "SELECT to_regclass('public.$tbl');" 2>/dev/null | tr -d ' \n')
  [ "$R" = "$tbl" ] && { echo "  PASS: table $tbl exists"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: table $tbl missing (got: $R)"; FAIL=$((FAIL+1)); }
done

echo "=== BLOCK 2: FOREIGN KEY INTEGRITY ==="
check_fk "2a company_profiles.tenant_id → tenants"     company_profiles tenant_id  tenants
check_fk "2b customers.tenant_id → tenants"            customers        tenant_id  tenants
check_fk "2c customers.user_id → users"                customers        user_id    users
check_fk "2d documents.tenant_id → tenants"            documents        tenant_id  tenants
check_fk "2e documents.branch_id → branches"           documents        branch_id  branches
check_fk "2f documents.customer_id → customers"        documents        customer_id customers
check_fk "2g documents.processed_by → users"           documents        processed_by users
check_fk "2h subscriptions.tenant_id → tenants"        subscriptions    tenant_id  tenants
check_fk "2i payments.subscription_id → subscriptions" payments         subscription_id subscriptions
check_fk "2j payments.tenant_id → tenants"             payments         tenant_id  tenants
check_fk "2k audit_logs.user_id → users"               audit_logs       user_id    users
check_fk "2l audit_logs.tenant_id → tenants"           audit_logs       tenant_id  tenants
check_fk "2m notifications.user_id → users"            notifications    user_id    users
check_fk "2n notifications.tenant_id → tenants"        notifications    tenant_id  tenants

echo "=== BLOCK 3: 12 ENUM TYPES ==="
ENUM_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(DISTINCT typname) FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid;" 2>/dev/null | tr -d ' \n')
[ "$ENUM_COUNT" -eq "12" ] && { echo "  PASS: 3a 12 ENUMs defined ($ENUM_COUNT)"; PASS=$((PASS+1)); } \
                            || { echo "  FAIL: 3a expected 12 ENUMs, got $ENUM_COUNT"; FAIL=$((FAIL+1)); }

for enum in user_role user_status token_type customer_id_type customer_status \
            document_type document_status subscription_status billing_interval \
            payment_status payment_method notification_type; do
  R=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
    "SELECT typname FROM pg_type WHERE typname='$enum';" 2>/dev/null | tr -d ' \n')
  [ "$R" = "$enum" ] && { echo "  PASS: ENUM $enum exists"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: ENUM $enum missing"; FAIL=$((FAIL+1)); }
done

echo "=== BLOCK 4: INDEXES ==="
IDX_COUNT=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc \
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" 2>/dev/null | tr -d ' \n')
[ "$IDX_COUNT" -ge "70" ] && { echo "  PASS: 4a $IDX_COUNT indexes defined"; PASS=$((PASS+1)); } \
                           || { echo "  FAIL: 4a only $IDX_COUNT indexes"; FAIL=$((FAIL+1)); }

echo "=== BLOCK 5: SEED DATA INTEGRITY ==="
check_count "5a tenants seeded"          tenants           4
check_count "5b company_profiles seeded" company_profiles  4
check_count "5c branches seeded"         branches          4
check_count "5d employees seeded"        employees         3
check_count "5e users seeded"            users             9
check_count "5f customers seeded"        customers         4
check_count "5g subscriptions seeded"    subscriptions     4

echo "=== BLOCK 6: REFERENTIAL INTEGRITY CHECKS ==="

# No orphaned employees
ORPHAN_EMP=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM employees e
  WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = e.branch_id)
     OR NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = e.tenant_id);" 2>/dev/null | tr -d ' \n')
[ "$ORPHAN_EMP" = "0" ] && { echo "  PASS: 6a no orphaned employees"; PASS=$((PASS+1)); } \
                         || { echo "  FAIL: 6a $ORPHAN_EMP orphaned employees"; FAIL=$((FAIL+1)); }

# No orphaned company_profiles
ORPHAN_CP=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM company_profiles cp
  WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = cp.tenant_id);" 2>/dev/null | tr -d ' \n')
[ "$ORPHAN_CP" = "0" ] && { echo "  PASS: 6b no orphaned company_profiles"; PASS=$((PASS+1)); } \
                        || { echo "  FAIL: 6b $ORPHAN_CP orphaned company_profiles"; FAIL=$((FAIL+1)); }

# No orphaned subscriptions
ORPHAN_SUB=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM subscriptions s
  WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = s.tenant_id);" 2>/dev/null | tr -d ' \n')
[ "$ORPHAN_SUB" = "0" ] && { echo "  PASS: 6c no orphaned subscriptions"; PASS=$((PASS+1)); } \
                         || { echo "  FAIL: 6c $ORPHAN_SUB orphaned subscriptions"; FAIL=$((FAIL+1)); }

# No orphaned customers
ORPHAN_CUST=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM customers c
  WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = c.tenant_id);" 2>/dev/null | tr -d ' \n')
[ "$ORPHAN_CUST" = "0" ] && { echo "  PASS: 6d no orphaned customers"; PASS=$((PASS+1)); } \
                          || { echo "  FAIL: 6d $ORPHAN_CUST orphaned customers"; FAIL=$((FAIL+1)); }

# Every tenant has exactly one company_profile
MISMATCH=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM tenants t
  WHERE t.is_deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM company_profiles cp WHERE cp.tenant_id = t.id);" 2>/dev/null | tr -d ' \n')
[ "$MISMATCH" = "0" ] && { echo "  PASS: 6e every active tenant has a company_profile"; PASS=$((PASS+1)); } \
                       || { echo "  FAIL: 6e $MISMATCH tenants without company_profile"; FAIL=$((FAIL+1)); }

# Every tenant has exactly one subscription
SUB_MISMATCH=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM tenants t
  WHERE t.is_deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.tenant_id = t.id);" 2>/dev/null | tr -d ' \n')
[ "$SUB_MISMATCH" = "0" ] && { echo "  PASS: 6f every active tenant has a subscription"; PASS=$((PASS+1)); } \
                           || { echo "  FAIL: 6f $SUB_MISMATCH tenants without subscription"; FAIL=$((FAIL+1)); }

# Employees cross-tenant check: employee.tenant_id must match branch.tenant_id
CROSS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM employees e
  JOIN branches b ON e.branch_id = b.id
  WHERE e.tenant_id != b.tenant_id;" 2>/dev/null | tr -d ' \n')
[ "$CROSS" = "0" ] && { echo "  PASS: 6g no cross-tenant employee/branch assignments"; PASS=$((PASS+1)); } \
                    || { echo "  FAIL: 6g $CROSS cross-tenant violations"; FAIL=$((FAIL+1)); }

# Customers scoped to correct tenant
CUST_CROSS=$(PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -Atc "
  SELECT COUNT(*) FROM customers c
  WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = c.tenant_id AND t.is_deleted = FALSE);" \
  2>/dev/null | tr -d ' \n')
[ "$CUST_CROSS" = "0" ] && { echo "  PASS: 6h all customers scoped to valid tenants"; PASS=$((PASS+1)); } \
                         || { echo "  FAIL: 6h $CUST_CROSS customers with invalid tenant"; FAIL=$((FAIL+1)); }

echo "=== BLOCK 7: CONSTRAINT TESTS ==="

# duplicate customer email within same tenant should fail
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO customers (tenant_id, full_name, email, status)
  VALUES ('886c9f73-82a4-4e75-a023-cc4802712c52', 'Dup Customer', 'hodan.jama@gmail.com', 'active');" 2>/dev/null
DUP_R=$?
[ "$DUP_R" != "0" ] && { echo "  PASS: 7a duplicate customer email in same tenant rejected"; PASS=$((PASS+1)); } \
                     || { echo "  FAIL: 7a duplicate customer email was allowed"; FAIL=$((FAIL+1)); }

# same customer email in DIFFERENT tenant should succeed
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO customers (tenant_id, full_name, email, status)
  VALUES ('8a0804b2-7018-4927-839d-b9c648ca3c9f', 'Other Tenant Customer', 'hodan.jama@gmail.com', 'active');" 2>/dev/null
CROSS_R=$?
[ "$CROSS_R" = "0" ] && { echo "  PASS: 7b same email in different tenant allowed"; PASS=$((PASS+1)); } \
                      || { echo "  FAIL: 7b same email in different tenant was rejected"; FAIL=$((FAIL+1)); }
# Clean up
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  DELETE FROM customers WHERE full_name IN ('Dup Customer','Other Tenant Customer');" 2>/dev/null

# document seal_code must be unique
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO documents (tenant_id, branch_id, document_number, title, doc_type, seal_code)
  VALUES (
    '886c9f73-82a4-4e75-a023-cc4802712c52',
    '135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
    'BOS-2026-TEST-001', 'Test Doc', 'AFFIDAVIT', 'SEAL-TEST-001'
  );" 2>/dev/null
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  INSERT INTO documents (tenant_id, branch_id, document_number, title, doc_type, seal_code)
  VALUES (
    '886c9f73-82a4-4e75-a023-cc4802712c52',
    '135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
    'BOS-2026-TEST-002', 'Test Doc 2', 'DEED', 'SEAL-TEST-001'
  );" 2>/dev/null
DUP_SEAL=$?
[ "$DUP_SEAL" != "0" ] && { echo "  PASS: 7c duplicate seal_code rejected"; PASS=$((PASS+1)); } \
                        || { echo "  FAIL: 7c duplicate seal_code was allowed"; FAIL=$((FAIL+1)); }
PGPASSWORD=notaryhub_dev_2026 psql -U notaryhub -h 127.0.0.1 -d notaryhub -q -c "
  DELETE FROM documents WHERE document_number LIKE 'BOS-2026-TEST-%';" 2>/dev/null

echo ""
echo "============================================"
echo " FINAL: $PASS passed / $((PASS+FAIL)) total   |   FAIL: $FAIL"
echo "============================================"
