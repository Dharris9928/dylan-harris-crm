CREATE OR REPLACE FUNCTION public.get_pipeline_comms_metrics(
  _from timestamptz,
  _to timestamptz,
  _prev_from timestamptz,
  _prev_to timestamptz,
  _perspective text DEFAULT 'all_records',
  _user_id uuid DEFAULT NULL,
  _company_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  cur_email_count integer,
  cur_opened integer,
  cur_responded integer,
  cur_call_scripts integer,
  cur_avg_response_days double precision,
  prev_email_count integer,
  prev_opened integer,
  prev_responded integer,
  prev_call_scripts integer
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      cc.communication_type,
      cc.sent_at,
      cc.email_opened_at,
      cc.email_responded_at,
      cc.user_id,
      cc.company_id,
      CASE WHEN cc.sent_at >= _from AND cc.sent_at <= _to THEN 1 ELSE 0 END AS in_cur,
      CASE WHEN cc.sent_at >= _prev_from AND cc.sent_at <= _prev_to THEN 1 ELSE 0 END AS in_prev
    FROM public.company_communications cc
    WHERE cc.sent_at >= LEAST(_from, _prev_from)
      AND cc.sent_at <= GREATEST(_to, _prev_to)
      AND (_company_ids IS NULL OR cc.company_id = ANY(_company_ids))
      AND (
        _perspective NOT IN ('my_records','assigned_to_me')
        OR _user_id IS NULL
        OR cc.user_id = _user_id
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE in_cur=1 AND communication_type='email')::int,
    COUNT(*) FILTER (WHERE in_cur=1 AND communication_type='email' AND email_opened_at IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE in_cur=1 AND communication_type='email' AND email_responded_at IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE in_cur=1 AND communication_type='call_script')::int,
    COALESCE(AVG(EXTRACT(EPOCH FROM (email_responded_at - sent_at))/86400.0)
      FILTER (WHERE in_cur=1 AND communication_type='email' AND email_responded_at IS NOT NULL AND sent_at IS NOT NULL AND email_responded_at >= sent_at), 0)::float8,
    COUNT(*) FILTER (WHERE in_prev=1 AND communication_type='email')::int,
    COUNT(*) FILTER (WHERE in_prev=1 AND communication_type='email' AND email_opened_at IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE in_prev=1 AND communication_type='email' AND email_responded_at IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE in_prev=1 AND communication_type='call_script')::int
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.get_pipeline_comms_metrics(timestamptz,timestamptz,timestamptz,timestamptz,text,uuid,uuid[]) TO authenticated;