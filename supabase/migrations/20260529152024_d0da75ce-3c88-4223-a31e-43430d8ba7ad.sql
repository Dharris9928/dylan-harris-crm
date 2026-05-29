-- Allow bulk-cron logging into enrichment_logs
ALTER TABLE public.enrichment_logs DROP CONSTRAINT IF EXISTS enrichment_logs_provider_check;
ALTER TABLE public.enrichment_logs ADD CONSTRAINT enrichment_logs_provider_check
  CHECK (provider = ANY (ARRAY[
    'lovable_ai','claude','deepseek','apollo','perplexity','gemini',
    'lovable_ai_manual','claude_manual','deepseek_manual','apollo_manual','perplexity_manual',
    'bulk_cron'
  ]));

ALTER TABLE public.enrichment_logs DROP CONSTRAINT IF EXISTS enrichment_logs_enrichment_type_check;
ALTER TABLE public.enrichment_logs ADD CONSTRAINT enrichment_logs_enrichment_type_check
  CHECK (enrichment_type = ANY (ARRAY['standard','deep','manual_reapply','bulk','bulk_summary']));

ALTER TABLE public.enrichment_logs DROP CONSTRAINT IF EXISTS enrichment_logs_status_check;
ALTER TABLE public.enrichment_logs ADD CONSTRAINT enrichment_logs_status_check
  CHECK (status = ANY (ARRAY['success','failed','rate_limited','low_confidence','no_segment']));

-- Allow summary rows (no specific company)
ALTER TABLE public.enrichment_logs ALTER COLUMN company_id DROP NOT NULL;