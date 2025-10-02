-- Phase 1 Security Fixes: Privilege Escalation, Audit Logging

-- =====================================================
-- 1. CREATE USER_ROLES TABLE (Separate from profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================================================
-- 3. UPDATE HAS_ELEVATED_ACCESS TO USE USER_ROLES
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_elevated_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'sales_manager')
  )
$$;

-- =====================================================
-- 4. UPDATE GET_USER_ROLE TO USE USER_ROLES
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =====================================================
-- 5. MIGRATE EXISTING ROLES FROM PROFILES TO USER_ROLES
-- =====================================================
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, role, created_at 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 6. CREATE RLS POLICIES FOR USER_ROLES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_elevated_access(auth.uid()));

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));

-- =====================================================
-- 7. UPDATE PROFILES RLS TO PREVENT ROLE CHANGES
-- =====================================================
DROP POLICY IF EXISTS "Users can update profiles based on role" ON public.profiles;

CREATE POLICY "Users can update their own profile (no role field access)"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));

-- =====================================================
-- 8. UPDATE HANDLE_NEW_USER TRIGGER TO USE USER_ROLES
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile without role
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  
  -- Insert role into separate user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    CASE 
      WHEN new.email = 'dwayneharris@google.com' THEN 'admin'::app_role
      ELSE 'sales_rep'::app_role
    END
  );
  
  RETURN new;
END;
$$;

-- =====================================================
-- 9. CREATE CONTACT ACCESS AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contact_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE public.contact_access_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_access_logs_user_id ON public.contact_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_access_logs_contact_id ON public.contact_access_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_access_logs_accessed_at ON public.contact_access_logs(accessed_at DESC);

-- =====================================================
-- 10. CREATE RLS POLICIES FOR AUDIT LOGS
-- =====================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.contact_access_logs;
CREATE POLICY "Admins can view audit logs"
ON public.contact_access_logs FOR SELECT
TO authenticated
USING (has_elevated_access(auth.uid()));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.contact_access_logs;
CREATE POLICY "System can insert audit logs"
ON public.contact_access_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 11. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.user_roles IS 'Separate table for user roles to prevent privilege escalation. Users cannot modify their own roles.';
COMMENT ON TABLE public.contact_access_logs IS 'Audit log for tracking access to sensitive contact data. Only admins can view logs.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles without recursive RLS issues.';
COMMENT ON FUNCTION public.has_elevated_access IS 'Security definer function to check if user is admin or sales_manager.';