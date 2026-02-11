
-- Create helper function for admin_superieur
CREATE OR REPLACE FUNCTION public.is_admin_superieur()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin_superieur')
$$;

-- Update is_admin to also include admin_superieur (super admin inherits all admin privileges)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_superieur')
$$;
