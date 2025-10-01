-- ============================================
-- ADD BUILDER & CONTRACTOR SPECIFIC FIELDS
-- ============================================

-- Builder-specific fields
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS average_home_price INTEGER,
ADD COLUMN IF NOT EXISTS price_point_category TEXT CHECK (price_point_category IN ('Entry-level', 'Mid-range', 'Luxury', 'Ultra-luxury'));

-- Contractor-specific fields
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS service_area_type TEXT CHECK (service_area_type IN ('Local', 'Regional', 'Multi-state', 'National')),
ADD COLUMN IF NOT EXISTS maintenance_contract_percentage INTEGER CHECK (maintenance_contract_percentage >= 0 AND maintenance_contract_percentage <= 100),
ADD COLUMN IF NOT EXISTS emergency_service_percentage INTEGER CHECK (emergency_service_percentage >= 0 AND emergency_service_percentage <= 100);

COMMENT ON COLUMN public.companies.average_home_price IS 'Average home price for builders (used in scoring)';
COMMENT ON COLUMN public.companies.price_point_category IS 'Price point category for builders';
COMMENT ON COLUMN public.companies.service_area_type IS 'Geographic service area type for contractors';
COMMENT ON COLUMN public.companies.maintenance_contract_percentage IS 'Percentage of business from maintenance contracts (contractors)';
COMMENT ON COLUMN public.companies.emergency_service_percentage IS 'Percentage of business from emergency services (contractors)';

-- ============================================
-- CREATE BUILDER SCORING DETAILS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.builder_scoring_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Builder-specific scoring breakdown
  volume_score INTEGER DEFAULT 0 CHECK (volume_score >= 0 AND volume_score <= 15),
  price_point_score INTEGER DEFAULT 0 CHECK (price_point_score >= 0 AND price_point_score <= 10),
  geographic_score INTEGER DEFAULT 0 CHECK (geographic_score >= 0 AND geographic_score <= 10),
  stability_score INTEGER DEFAULT 0 CHECK (stability_score >= 0 AND stability_score <= 15),
  firmographic_total INTEGER DEFAULT 0 CHECK (firmographic_total >= 0 AND firmographic_total <= 50),
  
  -- Digital engagement (same for both)
  website_quality_score INTEGER DEFAULT 0 CHECK (website_quality_score >= 0 AND website_quality_score <= 10),
  social_media_score INTEGER DEFAULT 0 CHECK (social_media_score >= 0 AND social_media_score <= 10),
  technology_adoption_score INTEGER DEFAULT 0 CHECK (technology_adoption_score >= 0 AND technology_adoption_score <= 10),
  digital_total INTEGER DEFAULT 0 CHECK (digital_total >= 0 AND digital_total <= 30),
  
  -- Contact scoring (same for both)
  decision_authority_score INTEGER DEFAULT 0 CHECK (decision_authority_score >= 0 AND decision_authority_score <= 10),
  linkedin_professional_score INTEGER DEFAULT 0 CHECK (linkedin_professional_score >= 0 AND linkedin_professional_score <= 10),
  contact_total INTEGER DEFAULT 0 CHECK (contact_total >= 0 AND contact_total <= 20),
  
  -- Totals
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  priority_tier TEXT CHECK (priority_tier IN ('P1', 'P2', 'P3', 'Unscored')),
  confidence TEXT CHECK (confidence IN ('High 90%+', 'Medium 70-89%', 'Low <70%')),
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per company
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.builder_scoring_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view builder scoring details"
  ON public.builder_scoring_details FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert builder scoring details"
  ON public.builder_scoring_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update builder scoring details"
  ON public.builder_scoring_details FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete builder scoring details"
  ON public.builder_scoring_details FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX idx_builder_scoring_company ON public.builder_scoring_details(company_id);
CREATE INDEX idx_builder_scoring_total ON public.builder_scoring_details(total_score DESC);
CREATE INDEX idx_builder_scoring_priority ON public.builder_scoring_details(priority_tier);

-- ============================================
-- CREATE CONTRACTOR SCORING DETAILS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.contractor_scoring_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Contractor-specific scoring breakdown
  volume_score INTEGER DEFAULT 0 CHECK (volume_score >= 0 AND volume_score <= 15),
  revenue_score INTEGER DEFAULT 0 CHECK (revenue_score >= 0 AND revenue_score <= 10),
  geographic_score INTEGER DEFAULT 0 CHECK (geographic_score >= 0 AND geographic_score <= 10),
  stability_score INTEGER DEFAULT 0 CHECK (stability_score >= 0 AND stability_score <= 10),
  business_model_score INTEGER DEFAULT 0 CHECK (business_model_score >= 0 AND business_model_score <= 5),
  firmographic_total INTEGER DEFAULT 0 CHECK (firmographic_total >= 0 AND firmographic_total <= 50),
  
  -- Digital engagement (same for both)
  website_quality_score INTEGER DEFAULT 0 CHECK (website_quality_score >= 0 AND website_quality_score <= 10),
  social_media_score INTEGER DEFAULT 0 CHECK (social_media_score >= 0 AND social_media_score <= 10),
  technology_adoption_score INTEGER DEFAULT 0 CHECK (technology_adoption_score >= 0 AND technology_adoption_score <= 10),
  digital_total INTEGER DEFAULT 0 CHECK (digital_total >= 0 AND digital_total <= 30),
  
  -- Contact scoring (same for both)
  decision_authority_score INTEGER DEFAULT 0 CHECK (decision_authority_score >= 0 AND decision_authority_score <= 10),
  linkedin_professional_score INTEGER DEFAULT 0 CHECK (linkedin_professional_score >= 0 AND linkedin_professional_score <= 10),
  contact_total INTEGER DEFAULT 0 CHECK (contact_total >= 0 AND contact_total <= 20),
  
  -- Totals
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  priority_tier TEXT CHECK (priority_tier IN ('P1', 'P2', 'P3', 'Unscored')),
  confidence TEXT CHECK (confidence IN ('High 90%+', 'Medium 70-89%', 'Low <70%')),
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per company
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.contractor_scoring_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view contractor scoring details"
  ON public.contractor_scoring_details FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert contractor scoring details"
  ON public.contractor_scoring_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contractor scoring details"
  ON public.contractor_scoring_details FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete contractor scoring details"
  ON public.contractor_scoring_details FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX idx_contractor_scoring_company ON public.contractor_scoring_details(company_id);
CREATE INDEX idx_contractor_scoring_total ON public.contractor_scoring_details(total_score DESC);
CREATE INDEX idx_contractor_scoring_priority ON public.contractor_scoring_details(priority_tier);