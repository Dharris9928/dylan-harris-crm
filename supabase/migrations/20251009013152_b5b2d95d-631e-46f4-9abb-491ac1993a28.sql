-- Create table for logging duplicate search operations
CREATE TABLE IF NOT EXISTS public.duplicate_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  search_type TEXT NOT NULL, -- 'companies', 'contacts', etc.
  search_parameters JSONB,
  results_found INTEGER DEFAULT 0,
  action_taken TEXT, -- 'viewed', 'merged', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.duplicate_search_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert logs
CREATE POLICY "Admins can view duplicate search logs"
  ON public.duplicate_search_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert duplicate search logs"
  ON public.duplicate_search_logs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') AND user_id = auth.uid());

-- Create function to find similar company names using trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to find potential duplicate companies
CREATE OR REPLACE FUNCTION find_duplicate_companies(
  similarity_threshold FLOAT DEFAULT 0.6,
  max_results INT DEFAULT 100
)
RETURNS TABLE(
  company1_id UUID,
  company1_name TEXT,
  company1_created_by UUID,
  company2_id UUID,
  company2_name TEXT,
  company2_created_by UUID,
  similarity_score FLOAT,
  same_industry BOOLEAN,
  same_state BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c1.id AS company1_id,
    c1.company_name AS company1_name,
    c1.created_by AS company1_created_by,
    c2.id AS company2_id,
    c2.company_name AS company2_name,
    c2.created_by AS company2_created_by,
    similarity(c1.company_name, c2.company_name) AS similarity_score,
    (c1.industry_type = c2.industry_type) AS same_industry,
    (c1.state = c2.state) AS same_state
  FROM companies c1
  INNER JOIN companies c2 ON c1.id < c2.id
  WHERE 
    similarity(c1.company_name, c2.company_name) >= similarity_threshold
    AND c1.parent_company_id IS NULL
    AND c2.parent_company_id IS NULL
    AND c1.is_parent_company = false
    AND c2.is_parent_company = false
  ORDER BY similarity(c1.company_name, c2.company_name) DESC
  LIMIT max_results;
END;
$$;

-- Create index for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (company_name gin_trgm_ops);

-- Ensure created_at exists on all main tables (most already have it, this is for safety)
DO $$ 
BEGIN
  -- Check and add created_at to tables that might not have it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;