-- SOC 2 Type II Preparation Tables

-- Change management log
CREATE TABLE IF NOT EXISTS public.change_management_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL CHECK (change_type IN ('code', 'infrastructure', 'configuration', 'security', 'database')),
  change_description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  implemented_by UUID REFERENCES auth.users(id),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  rollback_plan TEXT,
  testing_evidence TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'scheduled', 'implemented', 'rolled_back', 'rejected')),
  impact_assessment TEXT,
  affected_systems TEXT[],
  change_window TEXT,
  stakeholders_notified BOOLEAN DEFAULT false,
  documentation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security incidents tracking
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('unauthorized_access', 'data_breach', 'malware', 'phishing', 'dos', 'policy_violation', 'system_failure', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  detected_at TIMESTAMP WITH TIME ZONE,
  contained_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  incident_summary TEXT NOT NULL,
  impact_description TEXT,
  affected_systems TEXT[],
  affected_users_count INTEGER DEFAULT 0,
  root_cause TEXT,
  remediation_steps TEXT,
  lessons_learned TEXT,
  follow_up_actions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System availability monitoring
CREATE TABLE IF NOT EXISTS public.system_availability_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('uptime', 'performance', 'health_check', 'backup_status')),
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'outage')),
  response_time_ms INTEGER,
  uptime_percentage NUMERIC(5,2),
  error_count INTEGER DEFAULT 0,
  details JSONB,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vendor risk assessments
CREATE TABLE IF NOT EXISTS public.vendor_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_category TEXT NOT NULL CHECK (vendor_category IN ('infrastructure', 'software', 'security', 'compliance', 'data_processing', 'other')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assessed_by UUID REFERENCES auth.users(id),
  next_review_date TIMESTAMP WITH TIME ZONE,
  contract_start_date DATE,
  contract_end_date DATE,
  services_provided TEXT NOT NULL,
  data_access_level TEXT CHECK (data_access_level IN ('none', 'limited', 'full')),
  has_soc2_certification BOOLEAN DEFAULT false,
  has_iso27001_certification BOOLEAN DEFAULT false,
  has_gdpr_compliance BOOLEAN DEFAULT false,
  security_assessment_score INTEGER CHECK (security_assessment_score >= 0 AND security_assessment_score <= 100),
  compliance_issues TEXT,
  risk_mitigation_measures TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'terminated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Business continuity tests
CREATE TABLE IF NOT EXISTS public.business_continuity_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL CHECK (test_type IN ('disaster_recovery', 'backup_restore', 'failover', 'data_recovery', 'system_restore')),
  test_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  conducted_by UUID REFERENCES auth.users(id),
  duration_minutes INTEGER,
  result TEXT NOT NULL CHECK (result IN ('passed', 'failed', 'partial')),
  rto_target_minutes INTEGER, -- Recovery Time Objective
  rto_actual_minutes INTEGER,
  rpo_target_minutes INTEGER, -- Recovery Point Objective
  rpo_actual_minutes INTEGER,
  test_description TEXT NOT NULL,
  findings TEXT,
  issues_identified TEXT,
  corrective_actions TEXT,
  next_test_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.change_management_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_availability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_continuity_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only for most, managers for some viewing)
CREATE POLICY "Admins can manage change logs"
  ON public.change_management_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view change logs"
  ON public.change_management_log FOR SELECT
  TO authenticated
  USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "Admins can manage security incidents"
  ON public.security_incidents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view security incidents"
  ON public.security_incidents FOR SELECT
  TO authenticated
  USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "Admins can view system availability"
  ON public.system_availability_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert availability logs"
  ON public.system_availability_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage vendor assessments"
  ON public.vendor_risk_assessments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view vendor assessments"
  ON public.vendor_risk_assessments FOR SELECT
  TO authenticated
  USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "Admins can manage continuity tests"
  ON public.business_continuity_tests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view continuity tests"
  ON public.business_continuity_tests FOR SELECT
  TO authenticated
  USING (public.has_elevated_access(auth.uid()));

-- Indexes
CREATE INDEX idx_change_management_status ON public.change_management_log(status);
CREATE INDEX idx_change_management_date ON public.change_management_log(scheduled_date DESC);
CREATE INDEX idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX idx_system_availability_checked ON public.system_availability_log(checked_at DESC);
CREATE INDEX idx_vendor_assessments_review ON public.vendor_risk_assessments(next_review_date);

-- Update timestamp triggers
CREATE TRIGGER update_change_management_updated_at
  BEFORE UPDATE ON public.change_management_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_assessments_updated_at
  BEFORE UPDATE ON public.vendor_risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();