-- Security Fix: Tighten Audit Log Policies and Add Search Path to Functions

-- ============================================================================
-- PART 1: Fix Audit Log Policies
-- ============================================================================

-- Drop the overly permissive INSERT policy on approval_audit_log
DROP POLICY IF EXISTS "System can insert approval audit logs" ON public.approval_audit_log;

-- Create a more restrictive policy that only allows the system (via trigger) to insert
-- This prevents log poisoning by regular users
CREATE POLICY "Only triggers can insert approval audit logs"
ON public.approval_audit_log
FOR INSERT
TO authenticated
WITH CHECK (false); -- No direct inserts allowed, only via trigger

-- Update contact_access_logs to be more restrictive
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.contact_access_logs;

-- Create a more restrictive policy that verifies the user_id matches auth.uid()
-- and prevents arbitrary log insertion
CREATE POLICY "Users can only log their own access"
ON public.contact_access_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND contact_id IS NOT NULL 
  AND action IS NOT NULL
);

-- ============================================================================
-- PART 2: Add Search Path Protection to Functions
-- ============================================================================

-- Update update_updated_at_column() to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update auto_assign_priority_tier() to include search_path
CREATE OR REPLACE FUNCTION public.auto_assign_priority_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Automatically calculate priority_tier from lead_score
  IF NEW.lead_score >= 80 THEN
    NEW.priority_tier := 'P1';
  ELSIF NEW.lead_score >= 60 THEN
    NEW.priority_tier := 'P2';
  ELSIF NEW.lead_score >= 40 THEN
    NEW.priority_tier := 'P3';
  ELSE
    NEW.priority_tier := 'Unscored';
  END IF;
  
  -- Update timestamp
  NEW.score_calculated_at := NOW();
  
  RETURN NEW;
END;
$function$;

-- Update mark_company_for_recalculation() to include search_path
CREATE OR REPLACE FUNCTION public.mark_company_for_recalculation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark the parent company as needing recalculation by updating its timestamp
  UPDATE public.companies 
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add security comments
COMMENT ON FUNCTION public.update_updated_at_column() IS 
'Trigger function with search_path protection to prevent search path attacks';

COMMENT ON FUNCTION public.auto_assign_priority_tier() IS 
'Trigger function with search_path protection to prevent search path attacks';

COMMENT ON FUNCTION public.mark_company_for_recalculation() IS 
'Trigger function with search_path protection to prevent search path attacks';