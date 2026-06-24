DELETE FROM one_time_tokens;
DELETE FROM refresh_tokens;
DELETE FROM auth_audit_log;
DELETE FROM users WHERE email LIKE '%@test.local';
UPDATE users SET
  password_hash = '$2b$12$oNKmGg6JHumNfKIpa2sRs.uUij5LfhuvcpJ1vFUDIp0.MlJjJn6jS',
  failed_login_count = 0,
  locked_until = NULL
WHERE email = 'admin@notaryhub.local';
