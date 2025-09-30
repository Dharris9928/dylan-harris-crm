-- Add parent company support for franchise relationships
ALTER TABLE public.companies
ADD COLUMN parent_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN is_franchise boolean DEFAULT false;

-- Add index for parent company lookups
CREATE INDEX idx_companies_parent ON public.companies(parent_company_id);

COMMENT ON COLUMN public.companies.parent_company_id IS 'Reference to parent company for franchise relationships';
COMMENT ON COLUMN public.companies.is_franchise IS 'Indicates if this company is part of a franchise';