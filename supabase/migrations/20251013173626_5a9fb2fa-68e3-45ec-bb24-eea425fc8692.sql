-- GDPR/CCPA Compliance Documents

-- Privacy policy and terms management
CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('privacy_policy', 'terms_of_service', 'cookie_policy', 'dpa')),
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN DEFAULT false,
  change_summary TEXT,
  requires_user_acceptance BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User acceptance of compliance documents
CREATE TABLE IF NOT EXISTS public.document_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  document_id UUID NOT NULL REFERENCES public.compliance_documents(id),
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  acceptance_method TEXT CHECK (acceptance_method IN ('explicit', 'implicit', 'updated')),
  UNIQUE(user_id, document_id)
);

-- DPA (Data Processing Agreement) templates
CREATE TABLE IF NOT EXISTS public.dpa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('customer', 'vendor', 'subprocessor')),
  template_content TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  last_reviewed_date DATE,
  next_review_date DATE,
  legal_approved BOOLEAN DEFAULT false,
  legal_approved_by UUID REFERENCES auth.users(id),
  legal_approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- DPA agreements tracking
CREATE TABLE IF NOT EXISTS public.dpa_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.dpa_templates(id),
  counterparty_name TEXT NOT NULL,
  counterparty_type TEXT NOT NULL CHECK (counterparty_type IN ('customer', 'vendor', 'subprocessor')),
  signed_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'terminated')),
  signed_by_us UUID REFERENCES auth.users(id),
  signed_by_them TEXT,
  agreement_url TEXT,
  renewal_reminder_sent BOOLEAN DEFAULT false,
  data_categories TEXT[],
  processing_purposes TEXT[],
  retention_period TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpa_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view current compliance docs"
  ON public.compliance_documents FOR SELECT
  TO authenticated
  USING (is_current = true OR public.has_elevated_access(auth.uid()));

CREATE POLICY "Only admins can manage compliance documents"
  ON public.compliance_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own document acceptances"
  ON public.document_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_elevated_access(auth.uid()));

CREATE POLICY "Users can create their own document acceptances"
  ON public.document_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all DPA templates"
  ON public.dpa_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage DPA templates"
  ON public.dpa_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all DPA agreements"
  ON public.dpa_agreements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage DPA agreements"
  ON public.dpa_agreements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_compliance_docs_type ON public.compliance_documents(document_type);
CREATE INDEX idx_compliance_docs_current ON public.compliance_documents(is_current) WHERE is_current = true;
CREATE INDEX idx_document_acceptances_user ON public.document_acceptances(user_id);
CREATE INDEX idx_dpa_agreements_status ON public.dpa_agreements(status);
CREATE INDEX idx_dpa_agreements_expiry ON public.dpa_agreements(expiry_date) WHERE status = 'signed';

-- Update timestamp triggers
CREATE TRIGGER update_compliance_documents_updated_at
  BEFORE UPDATE ON public.compliance_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dpa_templates_updated_at
  BEFORE UPDATE ON public.dpa_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dpa_agreements_updated_at
  BEFORE UPDATE ON public.dpa_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one current version per document type
CREATE OR REPLACE FUNCTION ensure_single_current_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.compliance_documents
    SET is_current = false
    WHERE document_type = NEW.document_type
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_current_doc_trigger
  BEFORE INSERT OR UPDATE ON public.compliance_documents
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION ensure_single_current_document();