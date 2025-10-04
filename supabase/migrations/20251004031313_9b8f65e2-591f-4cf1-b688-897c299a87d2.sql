-- Create AI usage logs table
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feature_type TEXT NOT NULL, -- 'communication_generation', 'contact_scoring', 'lead_prioritization', 'outreach_strategy'
  ai_model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  company_id UUID REFERENCES public.companies(id),
  contact_id UUID REFERENCES public.contacts(id),
  communication_id UUID REFERENCES public.company_communications(id),
  request_metadata JSONB,
  response_metadata JSONB,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'rate_limited'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own AI usage
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

-- Policy: System can insert AI usage logs
CREATE POLICY "System can insert AI usage logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all AI usage logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for better query performance
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_feature_type ON public.ai_usage_logs(feature_type);
CREATE INDEX idx_ai_usage_logs_status ON public.ai_usage_logs(status);

-- Add comment
COMMENT ON TABLE public.ai_usage_logs IS 'Tracks all AI API usage across the platform for monitoring and cost analysis';
