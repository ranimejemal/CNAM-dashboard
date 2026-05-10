
CREATE OR REPLACE FUNCTION public.notify_new_threat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
           WHEN NEW.severity = 'critical' THEN 'error'
           WHEN NEW.severity = 'high' THEN 'warning'
           ELSE 'info'
         END,
         '/securite'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'admin_superieur', 'security_engineer');

  RETURN NEW;
END;
$function$;
