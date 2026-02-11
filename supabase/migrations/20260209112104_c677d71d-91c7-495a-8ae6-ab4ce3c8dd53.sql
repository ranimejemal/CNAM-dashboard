
-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'prestataire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'security_engineer';
