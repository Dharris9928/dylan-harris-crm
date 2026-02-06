-- Allow contacts to exist without a company association (for job quote contacts)
ALTER TABLE public.contacts ALTER COLUMN company_id DROP NOT NULL;