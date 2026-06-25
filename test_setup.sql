-- Clean all test state, reset admin password, apply correct seed
DELETE FROM employees;
DELETE FROM one_time_tokens;
DELETE FROM refresh_tokens;
DELETE FROM auth_audit_log;
DELETE FROM branches;
DELETE FROM users WHERE email NOT IN ('admin@notaryhub.local');
DELETE FROM tenants;

-- Reset super admin password to Admin@2026!
UPDATE users SET
  password_hash = '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
  failed_login_count = 0,
  locked_until = NULL,
  status = 'active'
WHERE email = 'admin@notaryhub.local';
