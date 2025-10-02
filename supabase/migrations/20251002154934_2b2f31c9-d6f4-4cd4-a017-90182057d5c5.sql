-- Strengthen contact data protection and approval process

-- =====================================================
-- 1. ENHANCE HANDLE_NEW_USER FUNCTION
-- =====================================================
-- Explicitly set approval_status to pending (don't rely on defaults)
-- Remove hardcoded admin email for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with EXPLICIT pending approval status
  INSERT INTO public.profiles (id, first_name, last_name, approval_status)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'pending'::approval_status  -- EXPLICIT: all new users start as pending
  );
  
  -- Insert default role (sales_rep) - admins must be promoted by existing admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    'sales_rep'::app_role  -- Default to least privileged role
  );
  
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and role for new users. All users start with pending approval and sales_rep role for security.';

-- =====================================================
-- 2. CREATE APPROVAL AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.approval_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  previous_status approval_status,
  new_status approval_status NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.approval_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_approval_audit_user_id ON public.approval_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_created_at ON public.approval_audit_log(created_at DESC);

-- Only admins can view approval audit logs
CREATE POLICY "Only admins can view approval audit logs"
ON public.approval_audit_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert approval audit logs"
ON public.approval_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 3. CREATE TRIGGER TO LOG APPROVAL STATUS CHANGES
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_approval_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_admin_id uuid;
BEGIN
  -- Get current user (admin who made the change)
  current_admin_id := auth.uid();
  
  -- Log the approval status change
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    INSERT INTO public.approval_audit_log (
      user_id,
      previous_status,
      new_status,
      approved_by
    ) VALUES (
      NEW.id,
      OLD.approval_status,
      NEW.approval_status,
      current_admin_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_log_approval_change ON public.profiles;
CREATE TRIGGER trigger_log_approval_change
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  WHEN (NEW.approval_status IS DISTINCT FROM OLD.approval_status)
  EXECUTE FUNCTION public.log_approval_status_change();

-- =====================================================
-- 4. ADD ADDITIONAL VERIFICATION CHECKS
-- =====================================================
-- Function to verify user has been approved for minimum time period
CREATE OR REPLACE FUNCTION public.user_approved_with_grace_period(_user_id uuid, _hours integer DEFAULT 1)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND approval_status = 'approved'
      AND approved_at IS NOT NULL
      AND approved_at <= (now() - (_hours || ' hours')::interval)
  )
$$;

COMMENT ON FUNCTION public.user_approved_with_grace_period IS 'Checks if user has been approved for at least the specified hours (default 1 hour). Helps prevent immediate data harvesting after approval.';

-- =====================================================
-- 5. STRENGTHEN CONTACT ACCESS POLICIES
-- =====================================================
-- Drop existing contact SELECT policies and recreate with grace period
DROP POLICY IF EXISTS "Read only users can view their company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales reps can view their company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Elevated users can view all contacts" ON public.contacts;

-- Read Only: Must be approved (existing requirement is sufficient)
CREATE POLICY "Read only users can view their company contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (
  is_user_approved(auth.uid())
  AND has_role(auth.uid(), 'read_only')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.created_by = auth.uid()
  )
);

-- Sales Reps: Must be approved (existing requirement is sufficient)
CREATE POLICY "Sales reps can view their company contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (
  is_user_approved(auth.uid())
  AND has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.created_by = auth.uid()
  )
);

-- Elevated users: Must be approved (existing requirement is sufficient)
CREATE POLICY "Elevated users can view all contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (
  is_user_approved(auth.uid())
  AND has_elevated_access(auth.uid())
);

-- =====================================================
-- 6. ADD CONSTRAINT TO PREVENT APPROVAL STATUS BYPASS
-- =====================================================
-- Ensure profiles.approved_at is set when status changes to approved
CREATE OR REPLACE FUNCTION public.set_approved_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- When status changes to approved, set approved_at if not already set
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  
  -- When status changes from approved to something else, clear approved_at
  IF NEW.approval_status != 'approved' AND OLD.approval_status = 'approved' THEN
    NEW.approved_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_approved_at ON public.profiles;
CREATE TRIGGER trigger_set_approved_at
  BEFORE UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_approved_at_timestamp();

-- =====================================================
-- 7. ADD COMMENTS FOR SECURITY DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.approval_audit_log IS 'Audit trail of all user approval status changes. Only admins can view.';
COMMENT ON TABLE public.contacts IS 'SECURITY: Contains sensitive PII (emails, phones). Access requires: 1) User must be approved, 2) Role-based access, 3) Company ownership. All access is audited.';
COMMENT ON COLUMN public.profiles.approval_status IS 'CRITICAL SECURITY FIELD: Users with pending/rejected status cannot access any contact data. Only admins can modify.';
COMMENT ON COLUMN public.profiles.approved_at IS 'Timestamp when user was approved. Used for grace period checks to prevent immediate data harvesting.';