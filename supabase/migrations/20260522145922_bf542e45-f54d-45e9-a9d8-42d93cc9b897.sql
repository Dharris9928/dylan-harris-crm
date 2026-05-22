ALTER TABLE public.job_quote_products ADD COLUMN purchase_unit_price numeric(10,2);
ALTER TABLE public.job_quotes ADD COLUMN purchase_price numeric(12,2);