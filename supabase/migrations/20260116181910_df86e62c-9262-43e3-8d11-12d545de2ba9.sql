-- Add password_changed_at column to track password expiration
ALTER TABLE public.user_security_settings 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add password_must_change column to force password change on first login
ALTER TABLE public.user_security_settings 
ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT true;

-- Update existing records to set password_changed_at
UPDATE public.user_security_settings 
SET password_changed_at = created_at 
WHERE password_changed_at IS NULL;