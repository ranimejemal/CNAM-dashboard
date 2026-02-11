-- Enable RLS on registration_otps table
ALTER TABLE public.registration_otps ENABLE ROW LEVEL SECURITY;

-- Only allow edge functions (service role) to manage OTPs
-- No public access at all - this table is only used by edge functions with service role
CREATE POLICY "No public access to OTPs"
ON public.registration_otps
FOR ALL
USING (false)
WITH CHECK (false);