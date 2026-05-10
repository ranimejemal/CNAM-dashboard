
-- Step 1: Add admin_superieur to app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_superieur';
