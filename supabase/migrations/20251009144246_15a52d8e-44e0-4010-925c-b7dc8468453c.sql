-- Add sales rep assignment column to companies table
ALTER TABLE public.companies
  ADD COLUMN assigned_to_sales_rep_id UUID REFERENCES public.sales_reps(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX idx_companies_assigned_to_sales_rep ON public.companies(assigned_to_sales_rep_id);

-- Add check constraint to ensure only one assignment type is used (either user or sales rep, not both)
ALTER TABLE public.companies
  ADD CONSTRAINT companies_assignment_check 
  CHECK (
    (assigned_to IS NULL AND assigned_to_sales_rep_id IS NULL) OR
    (assigned_to IS NOT NULL AND assigned_to_sales_rep_id IS NULL) OR
    (assigned_to IS NULL AND assigned_to_sales_rep_id IS NOT NULL)
  );