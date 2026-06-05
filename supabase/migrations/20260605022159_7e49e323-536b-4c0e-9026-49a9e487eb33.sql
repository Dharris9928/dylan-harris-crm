-- 1. Enums
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'business', 'enterprise');

CREATE TYPE public.quota_feature AS ENUM (
  'companies',
  'contacts',
  'opportunities',
  'apollo_enrich',
  'permit_ai_search',
  'ai_presentation',
  'ai_prioritize',
  'ai_score_contacts',
  'ai_outreach',
  'ai_communication'
);

-- 2. profiles: plan + trial fields
ALTER TABLE public.profiles
  ADD COLUMN plan public.plan_tier NOT NULL DEFAULT 'free',
  ADD COLUMN trial_started_at timestamptz,
  ADD COLUMN trial_ends_at timestamptz;

-- 3. usage_counters table
CREATE TABLE public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature public.quota_feature NOT NULL,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, period_start)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own counters"
  ON public.usage_counters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. has_quota: returns true if the user can still use the feature this period
CREATE OR REPLACE FUNCTION public.has_quota(_user_id uuid, _feature public.quota_feature)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan public.plan_tier;
  _trial_active boolean;
  _used integer;
  _limit integer;
BEGIN
  SELECT plan, (trial_ends_at IS NOT NULL AND trial_ends_at > now())
    INTO _plan, _trial_active
  FROM public.profiles
  WHERE id = _user_id;

  IF _plan IS NULL THEN
    RETURN false;
  END IF;

  -- Paid tiers (or active trial) get unlimited on gated AI/Apollo features
  IF _plan IN ('pro', 'business', 'enterprise') OR _trial_active THEN
    RETURN true;
  END IF;

  -- Free-tier monthly limits
  _limit := CASE _feature
    WHEN 'companies'         THEN 25
    WHEN 'contacts'          THEN 50
    WHEN 'opportunities'     THEN 10
    WHEN 'apollo_enrich'     THEN 10
    WHEN 'permit_ai_search'  THEN 3
    WHEN 'ai_presentation'   THEN 1
    WHEN 'ai_prioritize'     THEN 5
    WHEN 'ai_score_contacts' THEN 5
    WHEN 'ai_outreach'       THEN 5
    WHEN 'ai_communication'  THEN 3
  END;

  SELECT COALESCE(count, 0) INTO _used
  FROM public.usage_counters
  WHERE user_id = _user_id
    AND feature = _feature
    AND period_start = date_trunc('month', now())::date;

  RETURN COALESCE(_used, 0) < _limit;
END;
$$;

-- 5. start_pro_trial: one 14-day trial per user
CREATE OR REPLACE FUNCTION public.start_pro_trial()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.profiles;
BEGIN
  UPDATE public.profiles
     SET trial_started_at = COALESCE(trial_started_at, now()),
         trial_ends_at    = CASE
                              WHEN trial_started_at IS NULL THEN now() + interval '14 days'
                              ELSE trial_ends_at
                            END,
         updated_at = now()
   WHERE id = auth.uid()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- 6. is_demo flags on core tables (for seeded data + reset/cleanup jobs)
ALTER TABLE public.companies         ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts          ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.opportunities     ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.activities        ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.communications    ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.building_permits  ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX idx_usage_counters_user_period ON public.usage_counters(user_id, period_start);