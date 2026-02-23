
-- Issue 1: Fix weak encryption key fallback - fail explicitly instead
CREATE OR REPLACE FUNCTION public.get_encryption_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key TEXT;
BEGIN
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NOT NULL AND v_key <> '' THEN
    RETURN v_key;
  END IF;

  RAISE EXCEPTION 'Encryption key not available - cannot proceed. Please configure app.encryption_key.';
END;
$function$;

-- Issue 2: Fix search_path on 3 functions
CREATE OR REPLACE FUNCTION public.check_and_alert_brute_force(_ip_address inet)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_failed_attempts integer;
BEGIN
  SELECT COUNT(*)
  INTO v_failed_attempts
  FROM presentation_token_attempts
  WHERE ip_address = _ip_address
    AND success = false
    AND attempted_at > (now() - interval '1 hour');
  
  IF v_failed_attempts >= 20 THEN
    INSERT INTO bulk_access_alerts (
      alert_type,
      detected_at,
      ip_address,
      details
    ) VALUES (
      'TOKEN_BRUTE_FORCE',
      now(),
      _ip_address::text,
      jsonb_build_object(
        'failed_attempts', v_failed_attempts,
        'endpoint', 'validate-presentation-token',
        'window', '1 hour'
      )
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_presentation_token_rate_limit(_ip_address inet, _max_attempts integer DEFAULT 10, _window_minutes integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt_count integer;
  v_result jsonb;
BEGIN
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM presentation_token_attempts
  WHERE ip_address = _ip_address
    AND attempted_at > (now() - (_window_minutes || ' minutes')::interval);
  
  IF v_attempt_count >= _max_attempts THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'current_count', v_attempt_count,
      'limit', _max_attempts,
      'window_minutes', _window_minutes,
      'retry_after', 60
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'current_count', v_attempt_count,
      'limit', _max_attempts,
      'window_minutes', _window_minutes
    );
  END IF;
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_token_validation_attempt(_ip_address inet, _token_attempted text, _success boolean, _user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO presentation_token_attempts (ip_address, token_attempted, success, user_agent)
  VALUES (_ip_address, _token_attempted, _success, _user_agent);
END;
$function$;

-- Issue 3: Tighten RLS always-true INSERT policies to require authenticated users
DROP POLICY IF EXISTS "System can log status changes" ON public.account_status_changes;
CREATE POLICY "Authenticated users can log status changes" ON public.account_status_changes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert API audit logs" ON public.api_audit_log;
CREATE POLICY "Authenticated users can insert API audit logs" ON public.api_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert auth events" ON public.auth_events_log;
CREATE POLICY "Authenticated users can insert auth events" ON public.auth_events_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can log blocked signup attempts" ON public.blocked_signup_attempts;
CREATE POLICY "Authenticated users can log blocked signup attempts" ON public.blocked_signup_attempts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;
CREATE POLICY "Authenticated users can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert encryption audit logs" ON public.encryption_audit_log;
CREATE POLICY "Authenticated users can insert encryption audit logs" ON public.encryption_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert field access logs" ON public.field_access_audit_log;
CREATE POLICY "Authenticated users can insert field access logs" ON public.field_access_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can create alerts" ON public.permit_alerts;
CREATE POLICY "Authenticated users can create alerts" ON public.permit_alerts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert access logs" ON public.presentation_access_logs;
CREATE POLICY "Authenticated users can insert access logs" ON public.presentation_access_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert signup rate limits" ON public.signup_rate_limit;
CREATE POLICY "Authenticated users can insert signup rate limits" ON public.signup_rate_limit FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert availability logs" ON public.system_availability_log;
CREATE POLICY "Authenticated users can insert availability logs" ON public.system_availability_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
