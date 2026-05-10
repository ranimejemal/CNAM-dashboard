-- Fix incomplete RLS configuration for profiles and insured_members tables
-- These tables only have RESTRICTIVE policies. We need PERMISSIVE policies as well.
-- In PostgreSQL RLS: access = (any PERMISSIVE passes) AND (all RESTRICTIVE pass)
-- Without PERMISSIVE policies, the behavior is undefined/problematic.

-- ============================================
-- PROFILES TABLE: Add PERMISSIVE policies
-- ============================================

-- Allow authenticated users to potentially access (RESTRICTIVE policies will filter)
CREATE POLICY "profiles_permissive_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "profiles_permissive_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "profiles_permissive_update" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "profiles_permissive_delete" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (true);

-- ============================================
-- INSURED_MEMBERS TABLE: Add PERMISSIVE policies
-- ============================================

-- Allow authenticated users to potentially access (RESTRICTIVE policies will filter)
CREATE POLICY "insured_members_permissive_select" 
ON public.insured_members 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "insured_members_permissive_insert" 
ON public.insured_members 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "insured_members_permissive_update" 
ON public.insured_members 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "insured_members_permissive_delete" 
ON public.insured_members 
FOR DELETE 
TO authenticated
USING (true);