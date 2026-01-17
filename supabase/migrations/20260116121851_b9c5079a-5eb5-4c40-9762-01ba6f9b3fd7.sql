-- Create role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'validator');

-- Create status enums
CREATE TYPE public.reimbursement_status AS ENUM ('pending', 'processing', 'approved', 'rejected');
CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE public.member_status AS ENUM ('active', 'suspended', 'expired');
CREATE TYPE public.provider_status AS ENUM ('approved', 'pending', 'suspended');
CREATE TYPE public.provider_type AS ENUM ('hospital', 'doctor', 'pharmacy', 'laboratory');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create insured_members table
CREATE TABLE public.insured_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_number TEXT NOT NULL UNIQUE,
  cin TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  status member_status NOT NULL DEFAULT 'active',
  card_expiry_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create health_providers table
CREATE TABLE public.health_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type provider_type NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialty TEXT,
  status provider_status NOT NULL DEFAULT 'pending',
  approval_date DATE,
  invoices_processed INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reimbursements table
CREATE TABLE public.reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  insured_member_id UUID REFERENCES public.insured_members(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.health_providers(id) NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  amount_requested DECIMAL(10,2) NOT NULL,
  amount_approved DECIMAL(10,2) DEFAULT 0,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status reimbursement_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  validator_id UUID REFERENCES auth.users(id),
  validation_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insured_member_id UUID REFERENCES public.insured_members(id) ON DELETE CASCADE NOT NULL,
  reimbursement_id UUID REFERENCES public.reimbursements(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status document_status NOT NULL DEFAULT 'pending',
  validation_notes TEXT,
  validator_id UUID REFERENCES auth.users(id),
  validation_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  related_member_id UUID REFERENCES public.insured_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_logs table (append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_insured_members_updated_at BEFORE UPDATE ON public.insured_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_health_providers_updated_at BEFORE UPDATE ON public.health_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reimbursements_updated_at BEFORE UPDATE ON public.reimbursements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create role check helper function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create convenience role check functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'agent')
$$;

CREATE OR REPLACE FUNCTION public.is_validator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'validator')
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_agent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_agent()
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insured_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Agents can view all profiles" ON public.profiles FOR SELECT USING (public.is_agent());
CREATE POLICY "Validators can view all profiles" ON public.profiles FOR SELECT USING (public.is_validator());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = user_id);
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_admin());

-- USER_ROLES RLS Policies (only admins can modify)
CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin());

-- INSURED_MEMBERS RLS Policies
CREATE POLICY "Admins and agents can view members" ON public.insured_members FOR SELECT USING (public.is_admin_or_agent());
CREATE POLICY "Validators can view members" ON public.insured_members FOR SELECT USING (public.is_validator());
CREATE POLICY "Admins and agents can create members" ON public.insured_members FOR INSERT WITH CHECK (public.is_admin_or_agent());
CREATE POLICY "Admins and agents can update members" ON public.insured_members FOR UPDATE USING (public.is_admin_or_agent());
CREATE POLICY "Only admins can delete members" ON public.insured_members FOR DELETE USING (public.is_admin());

-- HEALTH_PROVIDERS RLS Policies
CREATE POLICY "Admins and agents can view providers" ON public.health_providers FOR SELECT USING (public.is_admin_or_agent());
CREATE POLICY "Validators can view providers" ON public.health_providers FOR SELECT USING (public.is_validator());
CREATE POLICY "Admins and agents can create providers" ON public.health_providers FOR INSERT WITH CHECK (public.is_admin_or_agent());
CREATE POLICY "Admins and agents can update providers" ON public.health_providers FOR UPDATE USING (public.is_admin_or_agent());
CREATE POLICY "Only admins can delete providers" ON public.health_providers FOR DELETE USING (public.is_admin());

-- REIMBURSEMENTS RLS Policies
CREATE POLICY "Admins can view all reimbursements" ON public.reimbursements FOR SELECT USING (public.is_admin());
CREATE POLICY "Agents can view all reimbursements" ON public.reimbursements FOR SELECT USING (public.is_agent());
CREATE POLICY "Validators can view pending reimbursements" ON public.reimbursements FOR SELECT USING (public.is_validator());
CREATE POLICY "Admins and agents can create reimbursements" ON public.reimbursements FOR INSERT WITH CHECK (public.is_admin_or_agent());
CREATE POLICY "Admins can update reimbursements" ON public.reimbursements FOR UPDATE USING (public.is_admin());
CREATE POLICY "Agents can update reimbursements" ON public.reimbursements FOR UPDATE USING (public.is_agent());
CREATE POLICY "Validators can update pending reimbursements" ON public.reimbursements FOR UPDATE USING (public.is_validator() AND status IN ('pending', 'processing'));
CREATE POLICY "Only admins can delete reimbursements" ON public.reimbursements FOR DELETE USING (public.is_admin());

-- DOCUMENTS RLS Policies
CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT USING (public.is_admin());
CREATE POLICY "Agents can view all documents" ON public.documents FOR SELECT USING (public.is_agent());
CREATE POLICY "Validators can view pending documents" ON public.documents FOR SELECT USING (public.is_validator());
CREATE POLICY "Admins and agents can create documents" ON public.documents FOR INSERT WITH CHECK (public.is_admin_or_agent());
CREATE POLICY "Admins can update documents" ON public.documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "Agents can update documents" ON public.documents FOR UPDATE USING (public.is_agent());
CREATE POLICY "Validators can update pending documents" ON public.documents FOR UPDATE USING (public.is_validator() AND status = 'pending');
CREATE POLICY "Only admins can delete documents" ON public.documents FOR DELETE USING (public.is_admin());

-- CALENDAR_EVENTS RLS Policies
CREATE POLICY "Admins and agents can view events" ON public.calendar_events FOR SELECT USING (public.is_admin_or_agent());
CREATE POLICY "Validators can view events" ON public.calendar_events FOR SELECT USING (public.is_validator());
CREATE POLICY "Admins and agents can create events" ON public.calendar_events FOR INSERT WITH CHECK (public.is_admin_or_agent());
CREATE POLICY "Admins and agents can update events" ON public.calendar_events FOR UPDATE USING (public.is_admin_or_agent());
CREATE POLICY "Only admins can delete events" ON public.calendar_events FOR DELETE USING (public.is_admin());

-- AUDIT_LOGS RLS Policies (append-only, read by admins only)
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Authenticated users can insert logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_insured_members_insurance_number ON public.insured_members(insurance_number);
CREATE INDEX idx_insured_members_cin ON public.insured_members(cin);
CREATE INDEX idx_insured_members_status ON public.insured_members(status);
CREATE INDEX idx_health_providers_type ON public.health_providers(type);
CREATE INDEX idx_health_providers_status ON public.health_providers(status);
CREATE INDEX idx_reimbursements_status ON public.reimbursements(status);
CREATE INDEX idx_reimbursements_submission_date ON public.reimbursements(submission_date);
CREATE INDEX idx_reimbursements_member ON public.reimbursements(insured_member_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_member ON public.documents(insured_member_id);
CREATE INDEX idx_calendar_events_date ON public.calendar_events(start_date);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);