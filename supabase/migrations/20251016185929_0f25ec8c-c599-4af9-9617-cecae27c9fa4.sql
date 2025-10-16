-- Phase 2: Record-Level Access Approval System
-- Implements company-level access approval with request workflow

-- 1. Create record_access_approvals table
CREATE TABLE IF NOT EXISTS public.record_access_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name text NOT NULL CHECK (table_name IN ('companies', 'contacts', 'opportunities')),
  record_id uuid NOT NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  access_level text NOT NULL DEFAULT 'view_full' CHECK (access_level IN ('view_basic', 'view_full', 'edit')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, table_name, record_id)
);

ALTER TABLE public.record_access_approvals ENABLE ROW LEVEL SECURITY;

-- 2. Create record_access_requests table
CREATE TABLE IF NOT EXISTS public.record_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name text NOT NULL CHECK (table_name IN ('companies', 'contacts', 'opportunities')),
  record_id uuid NOT NULL,
  requested_at timestamp with time zone DEFAULT now(),
  justification text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.record_access_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check record access
CREATE OR REPLACE FUNCTION public.has_record_access(_user_id uuid, _table_name text, _record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Elevated users (admin, sales_manager) have access to everything
  IF has_elevated_access(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if user created the record (auto-approved)
  IF _table_name = 'companies' THEN
    IF EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = _record_id AND created_by = _user_id
    ) THEN
      RETURN true;
    END IF;
    
    -- Check if user is assigned to the company (auto-approved)
    IF EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = _record_id AND assigned_to = _user_id
    ) THEN
      RETURN true;
    END IF;
  ELSIF _table_name = 'contacts' THEN
    -- For contacts, check if user has access to parent company
    IF EXISTS (
      SELECT 1 FROM public.contacts c
      JOIN public.companies co ON c.company_id = co.id
      WHERE c.id = _record_id 
      AND (co.created_by = _user_id OR co.assigned_to = _user_id)
    ) THEN
      RETURN true;
    END IF;
  ELSIF _table_name = 'opportunities' THEN
    -- For opportunities, check if user created it or is assigned
    IF EXISTS (
      SELECT 1 FROM public.opportunities
      WHERE id = _record_id 
      AND (created_by = _user_id OR assigned_to = _user_id)
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check explicit approval that hasn't expired
  RETURN EXISTS (
    SELECT 1 FROM public.record_access_approvals
    WHERE user_id = _user_id
    AND table_name = _table_name
    AND record_id = _record_id
    AND access_level IN ('view_full', 'edit')
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- 4. Create function to check if user can view basic info
CREATE OR REPLACE FUNCTION public.can_view_basic_info(_user_id uuid, _table_name text, _record_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- All approved users can see basic info (company name, industry, status)
  RETURN is_user_approved(_user_id);
END;
$$;

-- 5. Create function to auto-approve access when user is assigned
CREATE OR REPLACE FUNCTION public.auto_approve_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a company is assigned to a user, auto-approve their access
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.record_access_approvals (
      user_id,
      table_name,
      record_id,
      approved_by,
      access_level
    ) VALUES (
      NEW.assigned_to,
      'companies',
      NEW.id,
      auth.uid(), -- Current user who made the assignment
      'view_full'
    )
    ON CONFLICT (user_id, table_name, record_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger for auto-approval on company assignment
DROP TRIGGER IF EXISTS auto_approve_company_assignment ON public.companies;
CREATE TRIGGER auto_approve_company_assignment
AFTER UPDATE OF assigned_to ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_on_assignment();

-- 7. RLS Policies for record_access_approvals
CREATE POLICY "Users can view their own approvals"
ON public.record_access_approvals FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR has_elevated_access(auth.uid())));

CREATE POLICY "Elevated users can manage approvals"
ON public.record_access_approvals FOR ALL
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));

-- 8. RLS Policies for record_access_requests
CREATE POLICY "Users can view their own requests"
ON public.record_access_requests FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR has_elevated_access(auth.uid())));

CREATE POLICY "Users can create their own requests"
ON public.record_access_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Elevated users can manage requests"
ON public.record_access_requests FOR ALL
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));

-- 9. Create function to handle request approval
CREATE OR REPLACE FUNCTION public.approve_access_request(_request_id uuid, _access_level text DEFAULT 'view_full')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Only elevated users can approve
  IF NOT has_elevated_access(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and managers can approve access requests';
  END IF;
  
  -- Get the request
  SELECT * INTO request_record
  FROM public.record_access_requests
  WHERE id = _request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Create the approval
  INSERT INTO public.record_access_approvals (
    user_id,
    table_name,
    record_id,
    approved_by,
    access_level
  ) VALUES (
    request_record.user_id,
    request_record.table_name,
    request_record.record_id,
    auth.uid(),
    _access_level
  )
  ON CONFLICT (user_id, table_name, record_id) 
  DO UPDATE SET
    approved_by = auth.uid(),
    approved_at = now(),
    access_level = _access_level;
  
  -- Update the request status
  UPDATE public.record_access_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _request_id;
  
  RETURN true;
END;
$$;

-- 10. Create function to deny request
CREATE OR REPLACE FUNCTION public.deny_access_request(_request_id uuid, _review_notes text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only elevated users can deny
  IF NOT has_elevated_access(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and managers can deny access requests';
  END IF;
  
  UPDATE public.record_access_requests
  SET status = 'denied',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = _review_notes
  WHERE id = _request_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.record_access_approvals IS 
  'Tracks approved access to specific records. Auto-created for creators and assigned users.';

COMMENT ON TABLE public.record_access_requests IS 
  'Tracks user requests for record access. Requires elevated user approval.';

COMMENT ON FUNCTION public.has_record_access IS 
  'Checks if user has approved access to a record. Includes auto-approval for creators/assigned users.';

COMMENT ON FUNCTION public.can_view_basic_info IS 
  'Checks if user can view basic info (company name, industry, status) without full access.';