-- Add parent company relationship fields to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS is_parent_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_type VARCHAR(50) DEFAULT 'standalone',
  ADD COLUMN IF NOT EXISTS contractor_specialty TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_parent ON companies(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_is_parent ON companies(is_parent_company);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);

-- Add constraint to prevent circular references (self-parenting)
ALTER TABLE companies 
  ADD CONSTRAINT check_no_self_parent 
  CHECK (parent_company_id IS NULL OR parent_company_id != id);

-- Create a recursive view to show full company hierarchy
CREATE OR REPLACE VIEW company_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Base case: parent companies (no parent)
  SELECT 
    id,
    company_name,
    parent_company_id,
    0 as level,
    company_name as full_path,
    ARRAY[id] as path
  FROM companies
  WHERE parent_company_id IS NULL
  
  UNION ALL
  
  -- Recursive case: subsidiaries
  SELECT 
    c.id,
    c.company_name,
    c.parent_company_id,
    h.level + 1,
    h.full_path || ' > ' || c.company_name,
    h.path || c.id
  FROM companies c
  INNER JOIN hierarchy h ON c.parent_company_id = h.id
  WHERE NOT c.id = ANY(h.path) -- Prevent infinite loops
)
SELECT * FROM hierarchy;

-- Add comment explaining company_type options
COMMENT ON COLUMN companies.company_type IS 'Options: standalone, parent, subsidiary';
COMMENT ON COLUMN companies.contractor_specialty IS 'Relevant for contractors only - their specialty area';