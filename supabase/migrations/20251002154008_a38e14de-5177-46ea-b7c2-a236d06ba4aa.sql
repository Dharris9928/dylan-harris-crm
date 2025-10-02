-- Comprehensive RBAC: Approval System & Role Restrictions

-- =====================================================
-- 1. CREATE DELETION REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  record_details jsonb,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_table_name CHECK (table_name IN ('companies', 'contacts', 'outreach_activities', 'pilot_programs', 'training_certifications'))
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_by ON public.deletion_requests(requested_by);

-- =====================================================
-- 2. RLS POLICIES FOR DELETION REQUESTS
-- =====================================================
-- Users can view their own requests
CREATE POLICY "Users can view their own deletion requests"
ON public.deletion_requests FOR SELECT
TO authenticated
USING (requested_by = auth.uid() OR has_elevated_access(auth.uid()));

-- Users can create deletion requests
CREATE POLICY "Users can create deletion requests"
ON public.deletion_requests FOR INSERT
TO authenticated
WITH CHECK (requested_by = auth.uid());

-- Only admins can update (approve/reject) deletion requests
CREATE POLICY "Only admins can review deletion requests"
ON public.deletion_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. UPDATE COMPANIES RLS POLICIES
-- =====================================================
-- Remove existing policies and create role-based ones
DROP POLICY IF EXISTS "Users can update companies based on role" ON public.companies;
DROP POLICY IF EXISTS "Elevated users can delete companies" ON public.companies;

-- Read Only: Can only view their own companies
CREATE POLICY "Read only users can view their companies"
ON public.companies FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'read_only') 
  AND created_by = auth.uid()
);

-- Sales Reps: Can view their own and create new
CREATE POLICY "Sales reps can view their companies"
ON public.companies FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep') 
  AND created_by = auth.uid()
);

CREATE POLICY "Sales reps can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales_rep') 
  AND created_by = auth.uid()
);

CREATE POLICY "Sales reps can update their companies"
ON public.companies FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep') 
  AND created_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'sales_rep') 
  AND created_by = auth.uid()
);

-- Sales Managers & Admins: Can view and update all
CREATE POLICY "Elevated users can view all companies"
ON public.companies FOR SELECT
TO authenticated
USING (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can update all companies"
ON public.companies FOR UPDATE
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));

-- ONLY ADMINS can delete (no deletion requests needed for admins)
CREATE POLICY "Only admins can delete companies"
ON public.companies FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. UPDATE CONTACTS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Approved users can view contacts they own or elevated" ON public.contacts;
DROP POLICY IF EXISTS "Approved users can create contacts for their companies" ON public.contacts;
DROP POLICY IF EXISTS "Approved users can update contacts for their companies" ON public.contacts;
DROP POLICY IF EXISTS "Elevated users can delete contacts" ON public.contacts;

-- Read Only: Can only view contacts for their companies
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

-- Sales Reps: Can view and manage contacts for their companies
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

CREATE POLICY "Sales reps can create contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (
  is_user_approved(auth.uid())
  AND has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Sales reps can update their company contacts"
ON public.contacts FOR UPDATE
TO authenticated
USING (
  is_user_approved(auth.uid())
  AND has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  is_user_approved(auth.uid())
  AND has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND c.created_by = auth.uid()
  )
);

-- Elevated users can view and manage all contacts
CREATE POLICY "Elevated users can view all contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (
  is_user_approved(auth.uid())
  AND has_elevated_access(auth.uid())
);

CREATE POLICY "Elevated users can create contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (
  is_user_approved(auth.uid())
  AND has_elevated_access(auth.uid())
);

CREATE POLICY "Elevated users can update all contacts"
ON public.contacts FOR UPDATE
TO authenticated
USING (
  is_user_approved(auth.uid())
  AND has_elevated_access(auth.uid())
)
WITH CHECK (
  is_user_approved(auth.uid())
  AND has_elevated_access(auth.uid())
);

-- ONLY ADMINS can delete
CREATE POLICY "Only admins can delete contacts"
ON public.contacts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. UPDATE OUTREACH ACTIVITIES RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can create activities for their companies" ON public.outreach_activities;
DROP POLICY IF EXISTS "Users can update activities for their companies" ON public.outreach_activities;
DROP POLICY IF EXISTS "Users can view activities for their companies" ON public.outreach_activities;
DROP POLICY IF EXISTS "Elevated users can delete activities" ON public.outreach_activities;

-- Read Only: Can view activities for their companies
CREATE POLICY "Read only users can view their company activities"
ON public.outreach_activities FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'read_only')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = outreach_activities.company_id
    AND c.created_by = auth.uid()
  )
);

-- Sales Reps: Full CRUD except delete
CREATE POLICY "Sales reps can view their company activities"
ON public.outreach_activities FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = outreach_activities.company_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Sales reps can create activities"
ON public.outreach_activities FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sales_rep')
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = outreach_activities.company_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Sales reps can update their activities"
ON public.outreach_activities FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = outreach_activities.company_id
    AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'sales_rep')
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = outreach_activities.company_id
    AND c.created_by = auth.uid()
  )
);

-- Elevated users: Full access
CREATE POLICY "Elevated users can view all activities"
ON public.outreach_activities FOR SELECT
TO authenticated
USING (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can create activities"
ON public.outreach_activities FOR INSERT
TO authenticated
WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can update all activities"
ON public.outreach_activities FOR UPDATE
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));

-- ONLY ADMINS can delete
CREATE POLICY "Only admins can delete activities"
ON public.outreach_activities FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.deletion_requests IS 'Tracks deletion requests from non-admin users. Only admins can approve deletions.';
COMMENT ON COLUMN public.deletion_requests.status IS 'Status: pending (default), approved, rejected';
COMMENT ON COLUMN public.deletion_requests.table_name IS 'Which table the record belongs to (companies, contacts, outreach_activities, etc.)';

-- =====================================================
-- 7. CREATE FUNCTION TO LOG CONTACT ACCESS
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log SELECT operations on contacts table
  INSERT INTO public.contact_access_logs (
    user_id,
    contact_id,
    company_id,
    action,
    accessed_at
  ) VALUES (
    auth.uid(),
    NEW.id,
    NEW.company_id,
    'SELECT',
    now()
  );
  
  RETURN NEW;
END;
$$;