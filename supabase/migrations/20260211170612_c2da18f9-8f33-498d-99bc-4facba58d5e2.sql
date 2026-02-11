
-- Table to track blocked IPs
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'brute_force',
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  blocked_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins and security engineers can view
CREATE POLICY "Admins can view blocked IPs"
  ON public.blocked_ips FOR SELECT
  USING (is_admin());

CREATE POLICY "Security engineers can view blocked IPs"
  ON public.blocked_ips FOR SELECT
  USING (is_security_engineer());

-- System can insert (via edge functions with service role)
CREATE POLICY "System can insert blocked IPs"
  ON public.blocked_ips FOR INSERT
  WITH CHECK (true);

-- Admins can delete (unblock)
CREATE POLICY "Admins can delete blocked IPs"
  ON public.blocked_ips FOR DELETE
  USING (is_admin());

-- Index for fast IP lookups
CREATE INDEX idx_blocked_ips_ip ON public.blocked_ips (ip_address);
CREATE INDEX idx_blocked_ips_expires ON public.blocked_ips (expires_at);

-- Table for user login history (visible to users themselves)
CREATE TABLE public.user_login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success',
  device_fingerprint TEXT
);

ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
  ON public.user_login_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
  ON public.user_login_history FOR SELECT
  USING (is_admin());

-- Security engineers can view all login history
CREATE POLICY "Security engineers can view all login history"
  ON public.user_login_history FOR SELECT
  USING (is_security_engineer());

-- System insert
CREATE POLICY "System can insert login history"
  ON public.user_login_history FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_login_history_user ON public.user_login_history (user_id, login_at DESC);
