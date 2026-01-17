-- Add OTP columns to user_security_settings for 2FA
ALTER TABLE public.user_security_settings 
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_user_security_settings_otp 
ON public.user_security_settings(user_id, otp_code) 
WHERE otp_code IS NOT NULL;