-- Prevent exposure of authentication secrets from user_security_settings
-- We keep RLS policies but add column-level privilege barriers so clients cannot SELECT secrets.

-- 1) Remove broad SELECT from client roles
REVOKE ALL ON TABLE public.user_security_settings FROM anon;
REVOKE ALL ON TABLE public.user_security_settings FROM authenticated;

-- 2) Re-grant safe privileges
-- Allow authenticated clients to read only non-sensitive columns
GRANT SELECT (
  id,
  user_id,
  mfa_status,
  mfa_enabled_at,
  email_verified,
  last_login_at,
  last_login_ip,
  last_login_location,
  failed_login_attempts,
  locked_until,
  password_changed_at,
  password_must_change,
  security_notifications,
  trusted_devices,
  created_at,
  updated_at
) ON TABLE public.user_security_settings TO authenticated;

-- Allow authenticated clients to insert/update their own row (RLS still enforces ownership/admin)
GRANT INSERT, UPDATE ON TABLE public.user_security_settings TO authenticated;

-- 3) Explicitly ensure sensitive columns are not selectable by client roles
REVOKE SELECT (mfa_secret, otp_code, otp_expires_at, otp_attempts) ON TABLE public.user_security_settings FROM anon;
REVOKE SELECT (mfa_secret, otp_code, otp_expires_at, otp_attempts) ON TABLE public.user_security_settings FROM authenticated;