-- ============================================================================
-- PHASE 3: OPTIONAL SECURITY ENHANCEMENTS
-- ============================================================================
-- This migration adds advanced security features:
-- 1. Time-based access revocation system
-- 2. Data retention policies with auto-cleanup
-- 3. IP anonymization functions
-- 4. Audit alert triggers for bulk exports
-- 5. Rate limiting infrastructure
-- ============================================================================

-- ============================================================================
-- 1. TIME-BASED ACCESS REVOCATION SYSTEM
-- ============================================================================

-- Add access expiration columns to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMP WITH TIME ZONE DEFAULT now();

COMMENT ON COLUMN public.user_roles.access_expires_at IS 
'Optional expiration date for role access. When set, access is automatically revoked after this date. Useful for temporary contractors or time-limited access.';

COMMENT ON COLUMN public.user_roles.last_access_at IS 
'Timestamp of last system access. Used for inactive user detection and security monitoring.';

-- Create index for efficient expiration checks
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at 
ON public.user_roles(access_expires_at) 
WHERE access_expires_at IS NOT NULL;

-- Function to check if user role is still valid (not expired)
CREATE OR REPLACE FUNCTION public.is_role_active(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
    AND (access_expires_at IS NULL OR access_expires_at > now())
  )
$$;

COMMENT ON FUNCTION public.is_role_active IS 
'Enhanced role check that respects access expiration dates. Returns false if role has expired.';

-- Function to revoke expired access (can be called manually or via cron)
CREATE OR REPLACE FUNCTION public.revoke_expired_access()
RETURNS TABLE(
  revoked_user_id uuid,
  revoked_role app_role,
  expired_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.user_roles
  WHERE access_expires_at IS NOT NULL 
  AND access_expires_at < now()
  RETURNING user_id, role, access_expires_at;
  
  -- Log the revocations
  RAISE NOTICE 'Revoked % expired role assignments', 
    (SELECT COUNT(*) FROM public.user_roles WHERE access_expires_at < now());
END;
$$;

COMMENT ON FUNCTION public.revoke_expired_access IS 
'Removes expired role assignments. Should be run periodically via cron job or manually by admins.';

-- ============================================================================
-- 2. DATA RETENTION POLICIES WITH AUTO-CLEANUP
-- ============================================================================

-- Create table to store retention policies
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL UNIQUE,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  date_column text NOT NULL DEFAULT 'created_at',
  enabled boolean NOT NULL DEFAULT true,
  last_cleanup_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.data_retention_policies IS 
'Defines how long data should be retained in each table before automatic deletion. Used for GDPR compliance and storage management.';

-- Insert default retention policies for audit tables
INSERT INTO public.data_retention_policies (table_name, retention_days, date_column)
VALUES 
  ('contact_access_logs', 90, 'accessed_at'),
  ('approval_audit_log', 365, 'created_at'),
  ('enrichment_logs', 180, 'created_at')
ON CONFLICT (table_name) DO NOTHING;

-- Function to clean up old records based on retention policies
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS TABLE(
  cleaned_table text,
  records_deleted bigint,
  retention_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_record RECORD;
  deleted_count bigint;
BEGIN
  FOR policy_record IN 
    SELECT * FROM public.data_retention_policies 
    WHERE enabled = true
  LOOP
    EXECUTE format(
      'DELETE FROM public.%I WHERE %I < now() - interval ''%s days''',
      policy_record.table_name,
      policy_record.date_column,
      policy_record.retention_days
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update last cleanup timestamp
    UPDATE public.data_retention_policies
    SET last_cleanup_at = now()
    WHERE id = policy_record.id;
    
    -- Return results
    cleaned_table := policy_record.table_name;
    records_deleted := deleted_count;
    retention_days := policy_record.retention_days;
    
    RETURN NEXT;
    
    RAISE NOTICE 'Cleaned % records from % (retention: % days)', 
      deleted_count, policy_record.table_name, policy_record.retention_days;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_records IS 
'Automatically deletes records older than retention policy allows. Run via cron job for automated cleanup.';

-- Grant permissions for retention policies
GRANT SELECT ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO authenticated;

-- RLS policies for retention policies table
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage retention policies"
ON public.data_retention_policies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view retention policies"
ON public.data_retention_policies
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. IP ANONYMIZATION FUNCTIONS
-- ============================================================================

-- Function to anonymize IPv4 addresses (masks last octet)
CREATE OR REPLACE FUNCTION public.anonymize_ipv4(ip_addr inet)
RETURNS inet
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Replace last octet with 0 for IPv4
  IF family(ip_addr) = 4 THEN
    RETURN (host(ip_addr) || '/24')::inet & inet '255.255.255.0';
  END IF;
  -- Return as-is for IPv6 (handle separately if needed)
  RETURN ip_addr;
END;
$$;

COMMENT ON FUNCTION public.anonymize_ipv4 IS 
'Anonymizes IPv4 addresses by masking the last octet (e.g., 192.168.1.100 becomes 192.168.1.0). GDPR-compliant anonymization.';

-- Function to anonymize all IP addresses in audit logs
CREATE OR REPLACE FUNCTION public.anonymize_old_ip_addresses(_days_old integer DEFAULT 30)
RETURNS TABLE(
  table_name text,
  records_anonymized bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anonymized_count bigint;
BEGIN
  -- Anonymize contact access logs
  UPDATE public.contact_access_logs
  SET ip_address = anonymize_ipv4(ip_address)
  WHERE ip_address IS NOT NULL
  AND accessed_at < now() - (_days_old || ' days')::interval
  AND family(ip_address) = 4  -- Only IPv4 for now
  AND ip_address != anonymize_ipv4(ip_address);  -- Skip already anonymized
  
  GET DIAGNOSTICS anonymized_count = ROW_COUNT;
  
  table_name := 'contact_access_logs';
  records_anonymized := anonymized_count;
  RETURN NEXT;
  
  -- Anonymize approval audit logs
  UPDATE public.approval_audit_log
  SET ip_address = anonymize_ipv4(ip_address)
  WHERE ip_address IS NOT NULL
  AND created_at < now() - (_days_old || ' days')::interval
  AND family(ip_address) = 4
  AND ip_address != anonymize_ipv4(ip_address);
  
  GET DIAGNOSTICS anonymized_count = ROW_COUNT;
  
  table_name := 'approval_audit_log';
  records_anonymized := anonymized_count;
  RETURN NEXT;
  
  RAISE NOTICE 'IP anonymization complete';
END;
$$;

COMMENT ON FUNCTION public.anonymize_old_ip_addresses IS 
'Anonymizes IP addresses in audit logs older than specified days. Run periodically for GDPR compliance.';

-- ============================================================================
-- 4. AUDIT ALERT TRIGGERS FOR BULK EXPORTS
-- ============================================================================

-- Create table to track bulk access patterns
CREATE TABLE IF NOT EXISTS public.bulk_access_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  record_count integer NOT NULL,
  table_name text NOT NULL,
  alert_details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamp with time zone
);

COMMENT ON TABLE public.bulk_access_alerts IS 
'Tracks unusual bulk data access patterns that may indicate data exfiltration. Admins should review these regularly.';

-- Create index for unreviewed alerts
CREATE INDEX IF NOT EXISTS idx_bulk_alerts_unreviewed 
ON public.bulk_access_alerts(created_at DESC) 
WHERE reviewed = false;

-- Function to detect bulk contact exports
CREATE OR REPLACE FUNCTION public.detect_bulk_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_access_count integer;
  threshold_count integer := 50;  -- Alert if more than 50 contacts accessed in 10 minutes
BEGIN
  -- Count recent accesses by this user
  SELECT COUNT(DISTINCT contact_id)
  INTO recent_access_count
  FROM public.contact_access_logs
  WHERE user_id = NEW.user_id
  AND accessed_at > now() - interval '10 minutes'
  AND action IN ('EXPORT', 'BULK_VIEW');
  
  -- If threshold exceeded, create alert
  IF recent_access_count > threshold_count THEN
    INSERT INTO public.bulk_access_alerts (
      user_id,
      alert_type,
      record_count,
      table_name,
      alert_details
    ) VALUES (
      NEW.user_id,
      'BULK_CONTACT_ACCESS',
      recent_access_count,
      'contacts',
      jsonb_build_object(
        'action', NEW.action,
        'time_window', '10 minutes',
        'threshold', threshold_count
      )
    );
    
    RAISE NOTICE 'SECURITY ALERT: User % accessed % contacts in 10 minutes', 
      NEW.user_id, recent_access_count;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for bulk access detection
DROP TRIGGER IF EXISTS trigger_detect_bulk_access ON public.contact_access_logs;
CREATE TRIGGER trigger_detect_bulk_access
  AFTER INSERT ON public.contact_access_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_bulk_contact_access();

-- RLS policies for bulk access alerts
ALTER TABLE public.bulk_access_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view bulk access alerts"
ON public.bulk_access_alerts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update bulk access alerts"
ON public.bulk_access_alerts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 5. RATE LIMITING INFRASTRUCTURE
-- ============================================================================

-- Create table to track API request rates
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL,
  window_end timestamp with time zone NOT NULL,
  blocked boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limit_tracking IS 
'Tracks API request rates per user/endpoint for rate limiting. Used by edge functions to enforce request limits.';

-- Create index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_window 
ON public.rate_limit_tracking(user_id, endpoint, window_end) 
WHERE NOT blocked;

-- Create table to define rate limits
CREATE TABLE IF NOT EXISTS public.rate_limit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  requests_per_minute integer NOT NULL,
  requests_per_hour integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limit_rules IS 
'Defines rate limiting rules for different endpoints. Edge functions should check these before processing requests.';

-- Insert default rate limits for sensitive endpoints
INSERT INTO public.rate_limit_rules (endpoint, requests_per_minute, requests_per_hour)
VALUES 
  ('/functions/v1/apollo-contact-search', 10, 100),
  ('/functions/v1/apollo-enrich', 5, 50),
  ('/functions/v1/ai-score-contacts', 10, 100),
  ('/functions/v1/get-user-emails', 20, 200)
ON CONFLICT (endpoint) DO NOTHING;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _endpoint text,
  _window_minutes integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  limit_rule RECORD;
  is_allowed boolean;
BEGIN
  -- Get rate limit rule
  SELECT * INTO limit_rule
  FROM public.rate_limit_rules
  WHERE endpoint = _endpoint
  AND enabled = true;
  
  -- If no rule exists, allow by default
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'message', 'No rate limit configured'
    );
  END IF;
  
  -- Count recent requests in the window
  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM public.rate_limit_tracking
  WHERE user_id = _user_id
  AND endpoint = _endpoint
  AND window_end > now()
  AND NOT blocked;
  
  -- Check against limit
  IF _window_minutes = 1 THEN
    is_allowed := current_count < limit_rule.requests_per_minute;
  ELSE
    is_allowed := current_count < limit_rule.requests_per_hour;
  END IF;
  
  -- Record this request
  IF is_allowed THEN
    INSERT INTO public.rate_limit_tracking (
      user_id, endpoint, window_start, window_end
    ) VALUES (
      _user_id, _endpoint, now(), now() + (_window_minutes || ' minutes')::interval
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', is_allowed,
    'current_count', current_count + 1,
    'limit', CASE WHEN _window_minutes = 1 THEN limit_rule.requests_per_minute ELSE limit_rule.requests_per_hour END,
    'window_minutes', _window_minutes,
    'message', CASE 
      WHEN is_allowed THEN 'Request allowed'
      ELSE 'Rate limit exceeded'
    END
  );
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit IS 
'Checks if a user has exceeded rate limits for an endpoint. Call this from edge functions before processing requests.';

-- RLS policies for rate limiting tables
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limit tracking"
ON public.rate_limit_tracking
FOR SELECT
USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

CREATE POLICY "Only admins can manage rate limit rules"
ON public.rate_limit_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view rate limit rules"
ON public.rate_limit_rules
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_tracking()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.rate_limit_tracking
  WHERE window_end < now() - interval '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old rate limit tracking records', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_role_active TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_expired_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_records TO authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_ipv4 TO authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_old_ip_addresses TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_tracking TO authenticated;

-- ============================================================================
-- COMPLETION NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================================================
  PHASE 3: OPTIONAL SECURITY ENHANCEMENTS COMPLETE
  ============================================================================
  ✅ Time-based access revocation system added
     - access_expires_at column on user_roles
     - is_role_active() function respects expiration
     - revoke_expired_access() for cleanup
  
  ✅ Data retention policies implemented
     - data_retention_policies table with defaults
     - cleanup_old_records() for automated cleanup
     - 90-day retention for contact_access_logs
     - 365-day retention for approval_audit_log
  
  ✅ IP anonymization functions created
     - anonymize_ipv4() masks last octet
     - anonymize_old_ip_addresses() batch anonymization
     - GDPR-compliant IP handling
  
  ✅ Audit alert system for bulk exports
     - bulk_access_alerts table tracks unusual patterns
     - Trigger detects >50 contacts accessed in 10 min
     - Admin review workflow included
  
  ✅ Rate limiting infrastructure deployed
     - rate_limit_tracking and rate_limit_rules tables
     - check_rate_limit() function for edge functions
     - Default limits set for sensitive endpoints
  
  Recommended Cron Jobs (set up manually if needed):
  1. Run revoke_expired_access() daily
  2. Run cleanup_old_records() weekly
  3. Run anonymize_old_ip_addresses() monthly
  4. Run cleanup_rate_limit_tracking() hourly
  
  Edge Function Integration:
  - Add check_rate_limit() calls to apollo and AI functions
  - Reference rate_limit_rules for endpoint limits
  ============================================================================
  ';
END $$;