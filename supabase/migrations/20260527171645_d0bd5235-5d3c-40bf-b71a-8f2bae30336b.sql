-- ============================================================
-- Dylan Harris CRM — Full Database Schema
-- ============================================================

-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_manager', 'sales_rep', 'read_only');

CREATE TYPE public.company_status AS ENUM ('Lead', 'Active', 'Inactive');
CREATE TYPE public.company_industry AS ENUM ('Builder', 'Contractor', 'Energy Implementer', 'Engineer/Architect', 'Partner/Other');
CREATE TYPE public.priority_tier AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE public.opportunity_stage AS ENUM ('Open', 'Proposal', 'Committed', 'Purchased', 'Declined');
CREATE TYPE public.activity_type AS ENUM ('Call', 'Email', 'Meeting', 'Demo', 'Follow-up');
CREATE TYPE public.activity_outcome AS ENUM ('Scheduled', 'Completed', 'Cancelled');
CREATE TYPE public.communication_type AS ENUM ('Email', 'Call');
CREATE TYPE public.approval_type AS ENUM ('user_signup', 'deletion', 'export');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.region AS ENUM ('East', 'West');

-- 2. Core Tables

-- user_roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    title TEXT,
    phone TEXT,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    region region,
    industry company_industry,
    segment TEXT,
    revenue_range TEXT,
    annual_volume INTEGER,
    price_point TEXT,
    financial_health TEXT,
    status company_status NOT NULL DEFAULT 'Lead',
    priority_tier priority_tier,
    lead_score INTEGER DEFAULT 0,
    firmographic_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    contact_quality_score INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    assigned_to_sales_rep_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- contacts
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    linkedin_url TEXT,
    decision_authority TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    pii_encrypted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    assigned_to_sales_rep_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- opportunities
CREATE TABLE public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    stage opportunity_stage NOT NULL DEFAULT 'Open',
    expected_close_date DATE,
    estimated_value NUMERIC(12,2),
    assigned_to UUID REFERENCES auth.users(id),
    assigned_to_sales_rep_id UUID REFERENCES auth.users(id),
    probability INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- activities
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    type activity_type NOT NULL,
    outcome activity_outcome NOT NULL DEFAULT 'Scheduled',
    subject TEXT,
    description TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_to UUID REFERENCES auth.users(id),
    handoff_from UUID REFERENCES auth.users(id),
    handoff_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- communications
CREATE TABLE public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    type communication_type NOT NULL,
    subject TEXT,
    body TEXT,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    meeting_scheduled_at TIMESTAMPTZ,
    engagement_score INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- job_quotes
CREATE TABLE public.job_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    quote_number TEXT NOT NULL,
    title TEXT NOT NULL,
    line_items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft',
    po_filename TEXT,
    valid_until DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_quotes TO authenticated;
GRANT ALL ON public.job_quotes TO service_role;
ALTER TABLE public.job_quotes ENABLE ROW LEVEL SECURITY;

-- building_permits
CREATE TABLE public.building_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_number TEXT NOT NULL,
    jurisdiction TEXT,
    state TEXT,
    region region,
    city TEXT,
    address TEXT,
    project_type TEXT,
    project_value NUMERIC(12,2),
    square_footage INTEGER,
    issue_date DATE,
    expiration_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    contractor_name TEXT,
    owner_name TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    lat NUMERIC(10,6),
    lng NUMERIC(10,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_permits TO authenticated;
GRANT ALL ON public.building_permits TO service_role;
ALTER TABLE public.building_permits ENABLE ROW LEVEL SECURITY;

-- presentations
CREATE TABLE public.presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content JSONB DEFAULT '[]'::jsonb,
    share_token TEXT UNIQUE,
    share_enabled BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentations TO authenticated;
GRANT ALL ON public.presentations TO service_role;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- contact_access_log
CREATE TABLE public.contact_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contact_access_log TO authenticated;
GRANT ALL ON public.contact_access_log TO service_role;
ALTER TABLE public.contact_access_log ENABLE ROW LEVEL SECURITY;

-- approvals
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type approval_type NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    requested_by UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    target_table TEXT,
    target_id UUID,
    reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- auth_events
CREATE TABLE public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.auth_events TO authenticated;
GRANT ALL ON public.auth_events TO service_role;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- exports
CREATE TABLE public.exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    row_count INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exports TO authenticated;
GRANT ALL ON public.exports TO service_role;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- 3. Security Definer Functions
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

CREATE OR REPLACE FUNCTION public.has_elevated_access(_user_id UUID)
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
      AND role IN ('admin', 'sales_manager')
  )
$$;

-- 4. Lead Scoring Function
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    firmographic INTEGER := 0;
    engagement INTEGER := 0;
    contact_quality INTEGER := 0;
    total INTEGER := 0;
    contact_count INTEGER := 0;
    has_primary BOOLEAN := false;
BEGIN
    -- Firmographic score (max 50)
    IF NEW.industry = 'Builder' THEN
        firmographic := firmographic + 20;
        IF NEW.segment IN ('Production/Tract', 'Luxury Custom', 'Smart Home Champions') THEN
            firmographic := firmographic + 15;
        ELSIF NEW.segment IS NOT NULL THEN
            firmographic := firmographic + 10;
        END IF;
    ELSE
        firmographic := firmographic + 15;
        IF NEW.segment IS NOT NULL THEN
            firmographic := firmographic + 10;
        END IF;
    END IF;

    IF NEW.revenue_range IS NOT NULL THEN
        firmographic := firmographic + 10;
    END IF;
    IF NEW.annual_volume IS NOT NULL AND NEW.annual_volume > 0 THEN
        firmographic := firmographic + 5;
    END IF;

    -- Engagement score (max 30) - stubbed, will be updated by triggers
    IF NEW.website IS NOT NULL THEN
        engagement := engagement + 10;
    END IF;

    -- Contact quality (max 20)
    SELECT COUNT(*) INTO contact_count FROM public.contacts WHERE company_id = NEW.id;
    SELECT EXISTS(SELECT 1 FROM public.contacts WHERE company_id = NEW.id AND is_primary = true) INTO has_primary;
    
    IF contact_count > 0 THEN
        contact_quality := contact_quality + 5;
    END IF;
    IF contact_count >= 2 THEN
        contact_quality := contact_quality + 5;
    END IF;
    IF has_primary THEN
        contact_quality := contact_quality + 10;
    END IF;

    total := firmographic + engagement + contact_quality;

    NEW.firmographic_score := firmographic;
    NEW.engagement_score := engagement;
    NEW.contact_quality_score := contact_quality;
    NEW.lead_score := total;

    -- Auto-assign priority tier
    IF total >= 80 THEN
        NEW.priority_tier := 'P1';
    ELSIF total >= 60 THEN
        NEW.priority_tier := 'P2';
    ELSIF total >= 40 THEN
        NEW.priority_tier := 'P3';
    ELSE
        NEW.priority_tier := 'P4';
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Triggers
CREATE TRIGGER companies_lead_score_trigger
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.calculate_lead_score();

-- 6. RLS Policies
-- user_roles: users see their own roles, admins see all
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles: users own their profile, admins see all
CREATE POLICY "Users own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_elevated_access(auth.uid()));

-- companies: standard perspective-based access
CREATE POLICY "Users view companies" ON public.companies FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to_sales_rep_id = auth.uid()
);
CREATE POLICY "Users insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update own companies" ON public.companies FOR UPDATE TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to_sales_rep_id = auth.uid()
);
CREATE POLICY "Admins delete companies" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contacts: linked to companies
CREATE POLICY "Users view contacts" ON public.contacts FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to_sales_rep_id = auth.uid()
);
CREATE POLICY "Users insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update contacts" ON public.contacts FOR UPDATE TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to_sales_rep_id = auth.uid()
);
CREATE POLICY "Admins delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- opportunities
CREATE POLICY "Users view opportunities" ON public.opportunities FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR assigned_to_sales_rep_id = auth.uid()
);
CREATE POLICY "Users insert opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR assigned_to_sales_rep_id = auth.uid()
);
CREATE POLICY "Admins delete opportunities" ON public.opportunities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- activities
CREATE POLICY "Users view activities" ON public.activities FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
);
CREATE POLICY "Users insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update activities" ON public.activities FOR UPDATE TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
);
CREATE POLICY "Admins delete activities" ON public.activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- communications
CREATE POLICY "Users view communications" ON public.communications FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
);
CREATE POLICY "Users insert communications" ON public.communications FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update communications" ON public.communications FOR UPDATE TO authenticated USING (public.has_elevated_access(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Admins delete communications" ON public.communications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- job_quotes
CREATE POLICY "Users view job_quotes" ON public.job_quotes FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
);
CREATE POLICY "Users insert job_quotes" ON public.job_quotes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update job_quotes" ON public.job_quotes FOR UPDATE TO authenticated USING (public.has_elevated_access(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Admins delete job_quotes" ON public.job_quotes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- building_permits
CREATE POLICY "Users view permits" ON public.building_permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert permits" ON public.building_permits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update permits" ON public.building_permits FOR UPDATE TO authenticated USING (public.has_elevated_access(auth.uid()));
CREATE POLICY "Admins delete permits" ON public.building_permits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- presentations
CREATE POLICY "Users view presentations" ON public.presentations FOR SELECT TO authenticated USING (
    public.has_elevated_access(auth.uid())
    OR created_by = auth.uid()
    OR share_enabled = true
);
CREATE POLICY "Users insert presentations" ON public.presentations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update presentations" ON public.presentations FOR UPDATE TO authenticated USING (public.has_elevated_access(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Admins delete presentations" ON public.presentations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contact_access_log
CREATE POLICY "Users view own access logs" ON public.contact_access_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all access logs" ON public.contact_access_log FOR SELECT TO authenticated USING (public.has_elevated_access(auth.uid()));
CREATE POLICY "Users log access" ON public.contact_access_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- approvals
CREATE POLICY "Users view own approvals" ON public.approvals FOR SELECT TO authenticated USING (requested_by = auth.uid() OR public.has_elevated_access(auth.uid()));
CREATE POLICY "Users request approval" ON public.approvals FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Admins review approvals" ON public.approvals FOR UPDATE TO authenticated USING (public.has_elevated_access(auth.uid()));

-- auth_events
CREATE POLICY "Users view own events" ON public.auth_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all events" ON public.auth_events FOR SELECT TO authenticated USING (public.has_elevated_access(auth.uid()));
CREATE POLICY "System insert events" ON public.auth_events FOR INSERT TO authenticated WITH CHECK (true);

-- exports
CREATE POLICY "Users view own exports" ON public.exports FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_elevated_access(auth.uid()));
CREATE POLICY "Users request export" ON public.exports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins approve exports" ON public.exports FOR UPDATE TO authenticated USING (public.has_elevated_access(auth.uid()));
