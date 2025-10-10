-- Phase 2.1: Domain Verification & Monitoring
-- This migration creates infrastructure for email domain validation and monitoring

-- Table: allowed_email_domains
-- Stores the list of authorized email domains for user signups
CREATE TABLE public.allowed_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  domain_type TEXT NOT NULL DEFAULT 'business' CHECK (domain_type IN ('business', 'partner', 'contractor')),
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'failed')),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  mx_records_valid BOOLEAN
);

-- Add index for fast domain lookups
CREATE INDEX idx_allowed_email_domains_domain ON public.allowed_email_domains(domain) WHERE is_active = true;
CREATE INDEX idx_allowed_email_domains_active ON public.allowed_email_domains(is_active);

-- Enable RLS on allowed_email_domains
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for allowed_email_domains
CREATE POLICY "Admins can manage allowed domains"
ON public.allowed_email_domains
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view allowed domains"
ON public.allowed_email_domains
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Table: blocked_signup_attempts
-- Audit log for all blocked signup attempts
CREATE TABLE public.blocked_signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_reason TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  is_disposable BOOLEAN DEFAULT false,
  mx_records_checked BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  additional_details JSONB
);

-- Add indexes for querying blocked attempts
CREATE INDEX idx_blocked_signup_attempts_email ON public.blocked_signup_attempts(email);
CREATE INDEX idx_blocked_signup_attempts_domain ON public.blocked_signup_attempts(email_domain);
CREATE INDEX idx_blocked_signup_attempts_attempted_at ON public.blocked_signup_attempts(attempted_at DESC);

-- Enable RLS on blocked_signup_attempts
ALTER TABLE public.blocked_signup_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_signup_attempts
CREATE POLICY "Only admins can view blocked signup attempts"
ON public.blocked_signup_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert blocked attempts (no user context needed)
CREATE POLICY "System can log blocked signup attempts"
ON public.blocked_signup_attempts
FOR INSERT
WITH CHECK (true);

-- Function: check_email_domain_allowed
-- Checks if an email domain is in the allowed list
CREATE OR REPLACE FUNCTION public.check_email_domain_allowed(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Extract domain from email
  email_domain := lower(split_part(email_address, '@', 2));
  
  -- Check if domain is in allowed list and active
  RETURN EXISTS (
    SELECT 1
    FROM public.allowed_email_domains
    WHERE lower(domain) = email_domain
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.check_email_domain_allowed IS 
'Security function to check if an email domain is in the allowed domains list. Used by signup validation.';

-- Function: log_blocked_signup
-- Logs a blocked signup attempt for audit purposes
CREATE OR REPLACE FUNCTION public.log_blocked_signup(
  _email TEXT,
  _reason TEXT,
  _is_disposable BOOLEAN DEFAULT false,
  _ip_address INET DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  email_domain TEXT;
BEGIN
  email_domain := lower(split_part(_email, '@', 2));
  
  INSERT INTO public.blocked_signup_attempts (
    email,
    blocked_reason,
    email_domain,
    is_disposable,
    ip_address,
    additional_details
  ) VALUES (
    lower(_email),
    _reason,
    email_domain,
    _is_disposable,
    _ip_address,
    _details
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

COMMENT ON FUNCTION public.log_blocked_signup IS 
'Logs blocked signup attempts for security monitoring and compliance. Called by authentication triggers.';

-- Seed initial allowed domains (existing domains from handle_new_user function)
INSERT INTO public.allowed_email_domains (domain, domain_type, notes, is_active)
VALUES 
  ('google.com', 'partner', 'Google partnership domain', true),
  ('gfieldsales.com', 'business', 'Primary business domain', true),
  ('nestprorep.com', 'contractor', 'Nest Pro representative domain', true),
  ('gmail.com', 'business', 'Admin exception domain for dharris9928@gmail.com', true)
ON CONFLICT (domain) DO NOTHING;

COMMENT ON TABLE public.allowed_email_domains IS 
'Whitelist of authorized email domains for user registration. Admins manage this list to control signup access.';

COMMENT ON TABLE public.blocked_signup_attempts IS 
'Audit log of all blocked signup attempts for security monitoring and compliance reporting.';