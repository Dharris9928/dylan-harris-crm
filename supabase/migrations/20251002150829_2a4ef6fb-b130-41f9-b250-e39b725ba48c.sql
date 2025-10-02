-- Consolidate and strengthen profiles SELECT policies to prevent unauthorized PII access

-- 1) Drop duplicate SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles for approval" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;

-- 2) Create single, clear SELECT policy with approval requirement
-- Users can ONLY view their own profile OR (if elevated) all profiles for user management
CREATE POLICY "Users view own profile; elevated users view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User must be approved to access any profile data
  public.is_user_approved(auth.uid())
  AND (
    -- Users can always see their own profile
    id = auth.uid()
    -- Elevated users (admin/sales_manager) can see all profiles for user management
    OR public.has_elevated_access(auth.uid())
  )
);

-- 3) Document the security model
COMMENT ON POLICY "Users view own profile; elevated users view all" ON public.profiles IS
'Approved users can view their own profile. Admins and sales managers can view all profiles for user management and approval workflows. Unapproved users cannot access any profile data.';
