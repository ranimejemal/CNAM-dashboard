
-- Create helper functions for new roles
CREATE OR REPLACE FUNCTION public.is_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'user')
$$;

CREATE OR REPLACE FUNCTION public.is_prestataire()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'prestataire')
$$;

CREATE OR REPLACE FUNCTION public.is_security_engineer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'security_engineer')
$$;

-- RLS: Users can view own reimbursements
CREATE POLICY "Users can view own reimbursements"
ON public.reimbursements
FOR SELECT
USING (
  is_user() AND insured_member_id IN (
    SELECT im.id FROM public.insured_members im
    JOIN public.profiles p ON p.email = im.email
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Users can submit reimbursement requests
CREATE POLICY "Users can create own reimbursements"
ON public.reimbursements
FOR INSERT
WITH CHECK (
  is_user() AND insured_member_id IN (
    SELECT im.id FROM public.insured_members im
    JOIN public.profiles p ON p.email = im.email
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Users can view own documents
CREATE POLICY "Users can view own documents"
ON public.documents
FOR SELECT
USING (
  is_user() AND insured_member_id IN (
    SELECT im.id FROM public.insured_members im
    JOIN public.profiles p ON p.email = im.email
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Users can upload documents for themselves
CREATE POLICY "Users can create own documents"
ON public.documents
FOR INSERT
WITH CHECK (
  is_user() AND insured_member_id IN (
    SELECT im.id FROM public.insured_members im
    JOIN public.profiles p ON p.email = im.email
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Users can view events (read-only)
CREATE POLICY "Users can view events"
ON public.calendar_events
FOR SELECT
USING (is_user());

-- RLS: Users can view own insured member record
CREATE POLICY "Users can view own member record"
ON public.insured_members
FOR SELECT
USING (
  is_user() AND email = (
    SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- RLS: Prestataires can view own reimbursements
CREATE POLICY "Prestataires can view own reimbursements"
ON public.reimbursements
FOR SELECT
USING (
  is_prestataire() AND provider_id IN (
    SELECT hp.id FROM public.health_providers hp
    JOIN public.profiles p ON p.email = hp.email
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Prestataires can submit reimbursement claims
CREATE POLICY "Prestataires can create reimbursements"
ON public.reimbursements
FOR INSERT
WITH CHECK (
  is_prestataire() AND provider_id IN (
    SELECT hp.id FROM public.health_providers hp
    JOIN public.profiles p ON p.email = hp.email
    WHERE p.user_id = auth.uid()
  )
);

-- RLS: Prestataires can view related documents
CREATE POLICY "Prestataires can view related documents"
ON public.documents
FOR SELECT
USING (
  is_prestataire() AND reimbursement_id IN (
    SELECT r.id FROM public.reimbursements r
    WHERE r.provider_id IN (
      SELECT hp.id FROM public.health_providers hp
      JOIN public.profiles p ON p.email = hp.email
      WHERE p.user_id = auth.uid()
    )
  )
);

-- RLS: Prestataires can upload documents
CREATE POLICY "Prestataires can create documents"
ON public.documents
FOR INSERT
WITH CHECK (is_prestataire());

-- RLS: Prestataires can view own provider profile
CREATE POLICY "Prestataires can view own provider"
ON public.health_providers
FOR SELECT
USING (
  is_prestataire() AND email = (
    SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- RLS: Security engineers can view security events
CREATE POLICY "Security engineers can view security events"
ON public.security_events
FOR SELECT
USING (is_security_engineer());

-- RLS: Security engineers can view threats
CREATE POLICY "Security engineers can view threats"
ON public.threats
FOR SELECT
USING (is_security_engineer());

-- RLS: Security engineers can update threats
CREATE POLICY "Security engineers can update threats"
ON public.threats
FOR UPDATE
USING (is_security_engineer());

-- RLS: Security engineers can view audit logs
CREATE POLICY "Security engineers can view audit logs"
ON public.audit_logs
FOR SELECT
USING (is_security_engineer());

-- RLS: Security engineers can view user security settings
CREATE POLICY "Security engineers can view security settings"
ON public.user_security_settings
FOR SELECT
USING (is_security_engineer());

-- RLS: Security engineers can view notifications
CREATE POLICY "Security engineers can view notifications"
ON public.notifications
FOR SELECT
USING (is_security_engineer() AND (user_id = auth.uid() OR user_id IS NULL));
