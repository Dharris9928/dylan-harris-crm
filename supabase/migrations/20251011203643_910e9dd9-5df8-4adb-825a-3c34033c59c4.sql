
-- ================================================================
-- PHASE 2: DATA LOSS PREVENTION (DLP) - Export Controls
-- ================================================================

-- Export quotas configuration by role
CREATE TABLE IF NOT EXISTS public.export_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  daily_limit INTEGER NOT NULL,
  requires_approval_threshold INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default quotas
INSERT INTO public.export_quotas (role, daily_limit, requires_approval_threshold) VALUES
  ('read_only', 50, 50),
  ('sales_rep', 500, 100),
  ('sales_manager', 2000, 200),
  ('admin', 999999, 500)
ON CONFLICT (role) DO NOTHING;

-- Export logs table
CREATE TABLE IF NOT EXISTS public.export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('CSV', 'EXCEL', 'PDF', 'JSON')),
  filter_criteria JSONB,
  watermark TEXT, -- User ID + timestamp embedded in export
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_logs_user_id ON public.export_logs(user_id);
CREATE INDEX idx_export_logs_created_at ON public.export_logs(created_at);
CREATE INDEX idx_export_logs_table_name ON public.export_logs(table_name);

-- Export approval requests table
CREATE TABLE IF NOT EXISTS public.export_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  export_type TEXT NOT NULL,
  filter_criteria JSONB,
  business_justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_approvals_requested_by ON public.export_approval_requests(requested_by);
CREATE INDEX idx_export_approvals_status ON public.export_approval_requests(status);
CREATE INDEX idx_export_approvals_created_at ON public.export_approval_requests(created_at);

-- Enable RLS
ALTER TABLE public.export_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export_quotas
CREATE POLICY "All authenticated users can view export quotas"
  ON public.export_quotas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage export quotas"
  ON public.export_quotas FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for export_logs
CREATE POLICY "Users can view their own export logs"
  ON public.export_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all export logs"
  ON public.export_logs FOR SELECT
  TO authenticated
  USING (has_elevated_access(auth.uid()));

CREATE POLICY "System can insert export logs"
  ON public.export_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for export_approval_requests
CREATE POLICY "Users can view their own approval requests"
  ON public.export_approval_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Admins can view all approval requests"
  ON public.export_approval_requests FOR SELECT
  TO authenticated
  USING (has_elevated_access(auth.uid()));

CREATE POLICY "Users can create approval requests"
  ON public.export_approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update approval requests"
  ON public.export_approval_requests FOR UPDATE
  TO authenticated
  USING (has_elevated_access(auth.uid()))
  WITH CHECK (has_elevated_access(auth.uid()));

-- Function to check export quota
CREATE OR REPLACE FUNCTION public.check_export_quota(
  _user_id UUID,
  _record_count INTEGER,
  _table_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  daily_limit INTEGER;
  approval_threshold INTEGER;
  exports_today INTEGER;
  remaining_quota INTEGER;
  requires_approval BOOLEAN := false;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'User role not found',
      'requires_approval', false
    );
  END IF;
  
  -- Get quota limits for role
  SELECT eq.daily_limit, eq.requires_approval_threshold
  INTO daily_limit, approval_threshold
  FROM public.export_quotas eq
  WHERE eq.role = user_role;
  
  -- Count exports today
  SELECT COALESCE(SUM(record_count), 0)
  INTO exports_today
  FROM public.export_logs
  WHERE user_id = _user_id
    AND created_at >= CURRENT_DATE
    AND status = 'completed';
  
  remaining_quota := daily_limit - exports_today;
  
  -- Check if this export would exceed daily limit
  IF (exports_today + _record_count) > daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Export would exceed daily limit of %s records. Used: %s, Remaining: %s', 
        daily_limit, exports_today, remaining_quota),
      'daily_limit', daily_limit,
      'used_today', exports_today,
      'remaining_quota', remaining_quota,
      'requires_approval', false
    );
  END IF;
  
  -- Check if approval is required
  IF _record_count >= approval_threshold THEN
    requires_approval := true;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'requires_approval', requires_approval,
    'approval_threshold', approval_threshold,
    'daily_limit', daily_limit,
    'used_today', exports_today,
    'remaining_quota', remaining_quota,
    'record_count', _record_count
  );
END;
$$;

-- Function to log export activity
CREATE OR REPLACE FUNCTION public.log_export_activity(
  _user_id UUID,
  _table_name TEXT,
  _record_count INTEGER,
  _export_type TEXT,
  _filter_criteria JSONB DEFAULT NULL,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  export_id UUID;
  watermark_text TEXT;
BEGIN
  -- Generate watermark (user ID + timestamp)
  watermark_text := format('Exported by %s on %s', _user_id, now()::text);
  
  -- Insert export log
  INSERT INTO public.export_logs (
    user_id,
    table_name,
    record_count,
    export_type,
    filter_criteria,
    watermark,
    ip_address,
    user_agent
  ) VALUES (
    _user_id,
    _table_name,
    _record_count,
    _export_type,
    _filter_criteria,
    watermark_text,
    _ip_address,
    _user_agent
  )
  RETURNING id INTO export_id;
  
  -- Check for bulk access patterns
  PERFORM public.detect_bulk_export(_user_id, _record_count);
  
  RETURN export_id;
END;
$$;

-- Function to detect suspicious bulk exports
CREATE OR REPLACE FUNCTION public.detect_bulk_export(
  _user_id UUID,
  _current_export_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exports_last_hour INTEGER;
  total_records_last_hour INTEGER;
  alert_threshold INTEGER := 3; -- Alert if more than 3 exports in an hour
  record_threshold INTEGER := 1000; -- Alert if more than 1000 records in an hour
BEGIN
  -- Count exports in last hour
  SELECT 
    COUNT(*),
    COALESCE(SUM(record_count), 0)
  INTO exports_last_hour, total_records_last_hour
  FROM public.export_logs
  WHERE user_id = _user_id
    AND created_at > now() - interval '1 hour'
    AND status = 'completed';
  
  -- Create alert if thresholds exceeded
  IF exports_last_hour >= alert_threshold OR total_records_last_hour >= record_threshold THEN
    INSERT INTO public.bulk_access_alerts (
      user_id,
      alert_type,
      record_count,
      table_name,
      alert_details
    ) VALUES (
      _user_id,
      'BULK_EXPORT_DETECTED',
      total_records_last_hour,
      'multiple_tables',
      jsonb_build_object(
        'exports_count', exports_last_hour,
        'total_records', total_records_last_hour,
        'time_window', '1 hour',
        'current_export', _current_export_count
      )
    );
    
    RAISE NOTICE 'SECURITY ALERT: User % performed % exports totaling % records in last hour', 
      _user_id, exports_last_hour, total_records_last_hour;
  END IF;
END;
$$;

-- Function to cleanup expired approval requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_approvals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.export_approval_requests
  SET status = 'rejected',
      review_notes = 'Request expired after 24 hours'
  WHERE status = 'pending'
    AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Add trigger to auto-update updated_at on export_quotas
CREATE TRIGGER update_export_quotas_updated_at
  BEFORE UPDATE ON public.export_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
