ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS last_enrichment_attempt_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_queue ON public.companies (last_enrichment_attempt_at NULLS FIRST, id) WHERE builder_segment IS NULL;

CREATE TABLE IF NOT EXISTS public.bulk_enrichment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  tier TEXT NOT NULL DEFAULT 'free',
  batch_size INTEGER NOT NULL DEFAULT 20,
  retry_after_days INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.bulk_enrichment_settings (id, enabled) VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.bulk_enrichment_settings TO authenticated;
GRANT ALL ON public.bulk_enrichment_settings TO service_role;

ALTER TABLE public.bulk_enrichment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elevated users can view bulk enrichment settings"
ON public.bulk_enrichment_settings FOR SELECT TO authenticated
USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "Admins can update bulk enrichment settings"
ON public.bulk_enrichment_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));