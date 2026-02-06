-- Add contractor_id to job_quotes
ALTER TABLE public.job_quotes ADD COLUMN contractor_id UUID REFERENCES public.companies(id);

-- Create index for performance
CREATE INDEX idx_job_quotes_contractor_id ON public.job_quotes(contractor_id);