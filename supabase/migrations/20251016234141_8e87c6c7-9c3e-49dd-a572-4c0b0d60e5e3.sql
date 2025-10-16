-- Add account_status column to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' 
    CHECK (account_status IN ('active', 'suspended', 'deactivated'));
  END IF;
END $$;

-- Add status change tracking columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_changed_by UUID,
ADD COLUMN IF NOT EXISTS status_change_reason TEXT;

-- Create function to check if user account is active
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
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
      AND account_status = 'active'
  )
$$;

-- Update all existing RLS policies to check account status
-- Update companies policies
DROP POLICY IF EXISTS "All authenticated users can view all companies" ON companies;
CREATE POLICY "All authenticated users can view all companies"
ON companies
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid())
  AND is_account_active(auth.uid())
);

-- Update contacts policies
DROP POLICY IF EXISTS "Elevated users can view all contacts - authenticated only" ON contacts;
CREATE POLICY "Elevated users can view all contacts - authenticated only"
ON contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid()) 
  AND is_account_active(auth.uid())
  AND has_elevated_access(auth.uid())
);

DROP POLICY IF EXISTS "Sales reps can view their company contacts - authenticated only" ON contacts;
CREATE POLICY "Sales reps can view their company contacts - authenticated only"
ON contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid())
  AND is_account_active(auth.uid())
  AND has_role(auth.uid(), 'sales_rep'::app_role) 
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Assigned users can view their company contacts - authenticated" ON contacts;
CREATE POLICY "Assigned users can view their company contacts - authenticated"
ON contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid())
  AND is_account_active(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = contacts.company_id 
      AND c.assigned_to = auth.uid()
  )
);

-- Create account status change audit log table
CREATE TABLE IF NOT EXISTS public.account_status_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on account_status_changes
ALTER TABLE public.account_status_changes ENABLE ROW LEVEL SECURITY;

-- Only admins can view status changes
CREATE POLICY "Admins can view status changes"
ON public.account_status_changes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert status changes
CREATE POLICY "System can log status changes"
ON public.account_status_changes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_account_status_changes_user ON public.account_status_changes(user_id, created_at DESC);