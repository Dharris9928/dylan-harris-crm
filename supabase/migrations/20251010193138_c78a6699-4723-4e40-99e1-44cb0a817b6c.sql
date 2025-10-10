-- ============================================
-- PHASE 2: ACCESS CONTROL & COMPLIANCE
-- ============================================

-- Part 1: Restrict profile viewing to individual users only
-- Drop the overly permissive policy that allows elevated users to see all profiles
DROP POLICY IF EXISTS "Users must be authenticated to view profiles" ON public.profiles;

-- Create stricter policy: users can only view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Part 2: Create admin-specific function for user management
-- This allows admins to view all profiles through a controlled function
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  approval_status approval_status,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  role_frozen BOOLEAN,
  role_frozen_at TIMESTAMP WITH TIME ZONE,
  role_frozen_reason TEXT,
  user_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Log the access for audit trail
  INSERT INTO public.contact_access_logs (
    user_id,
    contact_id,
    action,
    accessed_at
  ) VALUES (
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder for profile access
    'ADMIN_PROFILE_VIEW',
    now()
  );

  -- Return all profiles with email from auth.users
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.approval_status,
    p.approved_at,
    p.created_at,
    p.role_frozen,
    p.role_frozen_at,
    p.role_frozen_reason,
    au.email::TEXT as user_email
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute to authenticated users (function itself checks admin role)
GRANT EXECUTE ON FUNCTION public.admin_get_all_profiles() TO authenticated;

COMMENT ON FUNCTION public.admin_get_all_profiles() IS 
'Admin-only function to view all user profiles. Requires admin role and logs access for audit trail. Part of Phase 2 security hardening.';

-- Part 3: Create function to get single profile by ID (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_profile(
  _user_id UUID
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  approval_status approval_status,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  role_frozen BOOLEAN,
  role_frozen_at TIMESTAMP WITH TIME ZONE,
  role_frozen_reason TEXT,
  user_email TEXT,
  user_role app_role
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Return single profile with role
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.approval_status,
    p.approved_at,
    p.created_at,
    p.role_frozen,
    p.role_frozen_at,
    p.role_frozen_reason,
    au.email::TEXT as user_email,
    ur.role as user_role
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE p.id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_profile(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_get_profile(UUID) IS 
'Admin-only function to view a single user profile by ID. Requires admin role. Part of Phase 2 security hardening.';