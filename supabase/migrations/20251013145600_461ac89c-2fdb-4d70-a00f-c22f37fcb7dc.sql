-- Priority 3: API Security Hardening Implementation

-- Create enum for API key permissions
CREATE TYPE api_permission AS ENUM ('read_only', 'read_write', 'admin');

-- Create enum for API key status
CREATE TYPE api_key_status AS ENUM ('active', 'revoked', 'expired');

-- API Keys Management Table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- Store hashed API key
  key_prefix TEXT NOT NULL, -- Store first 8 chars for identification (e.g., "sk_live_")
  permission_level api_permission NOT NULL DEFAULT 'read_only',
  status api_key_status NOT NULL DEFAULT 'active',
  
  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  -- Rate limiting per key
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  
  -- Allowed endpoints (null = all endpoints based on permission)
  allowed_endpoints TEXT[],
  
  -- IP whitelist (null = allow from any IP)
  allowed_ips INET[],
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,
  
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

-- Users can create their own API keys
CREATE POLICY "Users can create their own API keys"
ON public.api_keys
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own API keys (revoke, rename)
CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
USING (user_id = auth.uid() OR has_elevated_access(auth.uid()))
WITH CHECK (user_id = auth.uid() OR has_elevated_access(auth.uid()));

-- Only admins can delete API keys
CREATE POLICY "Admins can delete API keys"
ON public.api_keys
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create index for fast key lookups
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE status = 'active';
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_status ON public.api_keys(status);

-- API Audit Log Table
CREATE TABLE public.api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  query_parameters JSONB,
  
  -- Response details
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  
  -- Security context
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Partition for performance
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own API audit logs
CREATE POLICY "Users can view their own API logs"
ON public.api_audit_log
FOR SELECT
USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

-- System can insert API audit logs
CREATE POLICY "System can insert API audit logs"
ON public.api_audit_log
FOR INSERT
WITH CHECK (true);

-- Create indexes for query performance
CREATE INDEX idx_api_audit_key ON public.api_audit_log(api_key_id);
CREATE INDEX idx_api_audit_user ON public.api_audit_log(user_id);
CREATE INDEX idx_api_audit_created ON public.api_audit_log(created_at DESC);
CREATE INDEX idx_api_audit_endpoint ON public.api_audit_log(endpoint);
CREATE INDEX idx_api_audit_status ON public.api_audit_log(status_code);

-- Function to validate API key
CREATE OR REPLACE FUNCTION public.validate_api_key(
  _key_hash TEXT,
  _endpoint TEXT,
  _ip_address INET DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  user_id UUID,
  permission_level api_permission,
  key_id UUID,
  error_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Find the API key
  SELECT * INTO key_record
  FROM public.api_keys
  WHERE key_hash = _key_hash;
  
  -- Key not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::api_permission, NULL::UUID, 'Invalid API key'::TEXT;
    RETURN;
  END IF;
  
  -- Check if key is active
  IF key_record.status != 'active' THEN
    RETURN QUERY SELECT false, key_record.user_id, key_record.permission_level, key_record.id, 'API key is ' || key_record.status::TEXT;
    RETURN;
  END IF;
  
  -- Check if key is expired
  IF key_record.expires_at IS NOT NULL AND key_record.expires_at < NOW() THEN
    -- Auto-revoke expired key
    UPDATE public.api_keys
    SET status = 'expired'
    WHERE id = key_record.id;
    
    RETURN QUERY SELECT false, key_record.user_id, key_record.permission_level, key_record.id, 'API key has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check endpoint restrictions
  IF key_record.allowed_endpoints IS NOT NULL AND NOT (_endpoint = ANY(key_record.allowed_endpoints)) THEN
    RETURN QUERY SELECT false, key_record.user_id, key_record.permission_level, key_record.id, 'Endpoint not allowed for this API key'::TEXT;
    RETURN;
  END IF;
  
  -- Check IP restrictions
  IF key_record.allowed_ips IS NOT NULL AND _ip_address IS NOT NULL AND NOT (_ip_address = ANY(key_record.allowed_ips)) THEN
    RETURN QUERY SELECT false, key_record.user_id, key_record.permission_level, key_record.id, 'IP address not whitelisted'::TEXT;
    RETURN;
  END IF;
  
  -- Update last used timestamp and usage count
  UPDATE public.api_keys
  SET last_used_at = NOW(),
      usage_count = usage_count + 1
  WHERE id = key_record.id;
  
  -- Return valid result
  RETURN QUERY SELECT true, key_record.user_id, key_record.permission_level, key_record.id, NULL::TEXT;
END;
$$;

-- Function to check API key rate limits
CREATE OR REPLACE FUNCTION public.check_api_key_rate_limit(
  _api_key_id UUID,
  _endpoint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_record RECORD;
  minute_count INTEGER;
  hour_count INTEGER;
  is_allowed BOOLEAN;
BEGIN
  -- Get API key limits
  SELECT * INTO key_record
  FROM public.api_keys
  WHERE id = _api_key_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'API key not found'
    );
  END IF;
  
  -- Count requests in last minute
  SELECT COUNT(*) INTO minute_count
  FROM public.api_audit_log
  WHERE api_key_id = _api_key_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Count requests in last hour
  SELECT COUNT(*) INTO hour_count
  FROM public.api_audit_log
  WHERE api_key_id = _api_key_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Check limits
  is_allowed := minute_count < key_record.rate_limit_per_minute 
                AND hour_count < key_record.rate_limit_per_hour;
  
  RETURN jsonb_build_object(
    'allowed', is_allowed,
    'minute_count', minute_count,
    'minute_limit', key_record.rate_limit_per_minute,
    'hour_count', hour_count,
    'hour_limit', key_record.rate_limit_per_hour,
    'reason', CASE 
      WHEN NOT is_allowed THEN 'Rate limit exceeded'
      ELSE NULL
    END
  );
END;
$$;

-- Function to log API calls
CREATE OR REPLACE FUNCTION public.log_api_call(
  _api_key_id UUID,
  _user_id UUID,
  _endpoint TEXT,
  _method TEXT,
  _status_code INTEGER,
  _response_time_ms INTEGER DEFAULT NULL,
  _error_message TEXT DEFAULT NULL,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _request_headers JSONB DEFAULT NULL,
  _request_body JSONB DEFAULT NULL,
  _query_parameters JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.api_audit_log (
    api_key_id,
    user_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    error_message,
    ip_address,
    user_agent,
    request_headers,
    request_body,
    query_parameters
  ) VALUES (
    _api_key_id,
    _user_id,
    _endpoint,
    _method,
    _status_code,
    _response_time_ms,
    _error_message,
    _ip_address,
    _user_agent,
    _request_headers,
    _request_body,
    _query_parameters
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to revoke API key
CREATE OR REPLACE FUNCTION public.revoke_api_key(
  _key_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET status = 'revoked',
      revoked_at = NOW(),
      revoked_by = auth.uid(),
      revocation_reason = _reason
  WHERE id = _key_id
    AND (user_id = auth.uid() OR has_elevated_access(auth.uid()));
  
  RETURN FOUND;
END;
$$;

-- Function to cleanup old API audit logs
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs(
  _retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.api_audit_log
  WHERE created_at < NOW() - (_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old API audit logs', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Auto-update timestamp trigger
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT SELECT, INSERT ON public.api_audit_log TO authenticated;

-- Add to data retention policies
INSERT INTO public.data_retention_policies (table_name, date_column, retention_days, enabled)
VALUES ('api_audit_log', 'created_at', 90, true)
ON CONFLICT (table_name) DO UPDATE
SET retention_days = 90, enabled = true;