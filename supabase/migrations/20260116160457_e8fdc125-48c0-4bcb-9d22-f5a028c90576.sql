-- Create registration_requests table
CREATE TABLE public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a registration request (public form)
CREATE POLICY "Anyone can submit registration request"
ON public.registration_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view registration requests
CREATE POLICY "Admins can view all registration requests"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can update registration requests
CREATE POLICY "Admins can update registration requests"
ON public.registration_requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_registration_requests_updated_at
BEFORE UPDATE ON public.registration_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify admins of new registration requests
CREATE OR REPLACE FUNCTION public.notify_new_registration_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
         '📝 Nouvelle demande d''inscription',
         NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.email || ') demande un compte',
         'info',
         '/utilisateurs'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Create trigger to notify admins
CREATE TRIGGER trigger_notify_new_registration_request
AFTER INSERT ON public.registration_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_registration_request();