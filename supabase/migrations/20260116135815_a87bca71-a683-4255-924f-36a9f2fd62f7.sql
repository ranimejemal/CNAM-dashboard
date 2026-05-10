-- Create enum for threat severity
CREATE TYPE public.threat_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for security event type
CREATE TYPE public.security_event_type AS ENUM ('login_success', 'login_failure', 'logout', 'password_change', 'mfa_enabled', 'mfa_disabled', 'suspicious_activity', 'access_denied', 'session_expired', 'ip_blocked');

-- Create enum for 2FA status
CREATE TYPE public.mfa_status AS ENUM ('disabled', 'pending', 'enabled', 'enforced');

-- Create security_events table for SIEM dashboard
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type security_event_type NOT NULL,
  severity threat_severity NOT NULL DEFAULT 'low',
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create threats table for tracking detected threats
CREATE TABLE public.threats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity threat_severity NOT NULL,
  category TEXT NOT NULL,
  affected_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_system TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  actions_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_security_settings table for 2FA and security preferences
CREATE TABLE public.user_security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mfa_status mfa_status NOT NULL DEFAULT 'disabled',
  mfa_secret TEXT,
  mfa_enabled_at TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip TEXT,
  last_login_location TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  trusted_devices JSONB DEFAULT '[]',
  security_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_logs table for tracking email deliveries
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Security events policies (admins only)
CREATE POLICY "Only admins can view security events"
ON public.security_events FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert security events"
ON public.security_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update security events"
ON public.security_events FOR UPDATE
USING (public.is_admin());

-- Threats policies (admins only)
CREATE POLICY "Only admins can view threats"
ON public.threats FOR SELECT
USING (public.is_admin());

CREATE POLICY "Only admins can insert threats"
ON public.threats FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update threats"
ON public.threats FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Only admins can delete threats"
ON public.threats FOR DELETE
USING (public.is_admin());

-- User security settings policies
CREATE POLICY "Users can view their own security settings"
ON public.user_security_settings FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own security settings"
ON public.user_security_settings FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "System can insert security settings"
ON public.user_security_settings FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Email logs policies (admins only)
CREATE POLICY "Only admins can view email logs"
ON public.email_logs FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_threats_updated_at
BEFORE UPDATE ON public.threats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_security_settings_updated_at
BEFORE UPDATE ON public.user_security_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type security_event_type,
  p_severity threat_severity,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, ip_address, user_agent, location, details
  ) VALUES (
    p_user_id, p_event_type, p_severity, p_ip_address, p_user_agent, p_location, p_details
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;