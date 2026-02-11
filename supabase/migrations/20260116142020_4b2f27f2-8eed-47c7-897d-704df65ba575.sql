-- Create a function to send security alerts via edge function
CREATE OR REPLACE FUNCTION public.notify_security_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Only send alerts for medium, high, or critical severity events
  IF NEW.severity IN ('medium', 'high', 'critical') THEN
    -- Get user email if user_id exists
    IF NEW.user_id IS NOT NULL THEN
      SELECT email INTO v_user_email
      FROM public.profiles
      WHERE user_id = NEW.user_id;
    END IF;

    -- Insert a notification for admins
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
           CASE NEW.event_type
             WHEN 'login_failure' THEN 'Échec de connexion'
             WHEN 'suspicious_activity' THEN 'Activité suspecte détectée'
             WHEN 'access_denied' THEN 'Accès refusé'
             WHEN 'ip_blocked' THEN 'IP bloquée'
             ELSE 'Événement de sécurité'
           END,
           CASE NEW.severity
             WHEN 'critical' THEN '🚨 CRITIQUE: '
             WHEN 'high' THEN '⚠️ ÉLEVÉ: '
             ELSE '📢 '
           END || 
           COALESCE(v_user_email, 'Utilisateur inconnu') || 
           ' - ' || NEW.event_type,
           CASE 
             WHEN NEW.severity = 'critical' THEN 'destructive'
             WHEN NEW.severity = 'high' THEN 'warning'
             ELSE 'info'
           END,
           '/securite'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for security events
DROP TRIGGER IF EXISTS on_security_event_notify ON public.security_events;
CREATE TRIGGER on_security_event_notify
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_security_event();

-- Create a function to handle threat notifications
CREATE OR REPLACE FUNCTION public.notify_new_threat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notification for all admins
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
         '🛡️ Nouvelle menace détectée',
         CASE NEW.severity
           WHEN 'critical' THEN '🚨 CRITIQUE: '
           WHEN 'high' THEN '⚠️ ÉLEVÉ: '
           WHEN 'medium' THEN '📢 MOYEN: '
           ELSE ''
         END || NEW.title,
         CASE 
           WHEN NEW.severity = 'critical' THEN 'destructive'
           WHEN NEW.severity = 'high' THEN 'warning'
           ELSE 'info'
         END,
         '/securite'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

-- Create trigger for threats
DROP TRIGGER IF EXISTS on_threat_notify ON public.threats;
CREATE TRIGGER on_threat_notify
  AFTER INSERT ON public.threats
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_threat();