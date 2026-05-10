
CREATE OR REPLACE FUNCTION public.notify_security_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email TEXT;
BEGIN
  IF NEW.severity IN ('medium', 'high', 'critical') THEN
    IF NEW.user_id IS NOT NULL THEN
      SELECT email INTO v_user_email
      FROM public.profiles
      WHERE user_id = NEW.user_id;
    END IF;

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
             WHEN NEW.severity = 'critical' THEN 'error'
             WHEN NEW.severity = 'high' THEN 'warning'
             ELSE 'info'
           END,
           '/securite'
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'admin_superieur', 'security_engineer');
  END IF;

  RETURN NEW;
END;
$function$;
