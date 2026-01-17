-- Create table for registration OTPs
CREATE TABLE public.registration_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  otp_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access this table
-- This is intentional as OTPs are managed by edge functions only

-- Add index for cleanup queries
CREATE INDEX idx_registration_otps_expires_at ON public.registration_otps(expires_at);

-- Add comment
COMMENT ON TABLE public.registration_otps IS 'Temporary OTP storage for email verification during registration requests';