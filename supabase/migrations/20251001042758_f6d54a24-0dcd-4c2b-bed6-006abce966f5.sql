-- Update RLS policies for profiles table to allow admin access

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Allow users to view their own profile OR admins to view all profiles
CREATE POLICY "Users can view profiles based on role"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR public.has_elevated_access(auth.uid())
);

-- Users can update their own profile, admins can update any profile
CREATE POLICY "Users can update profiles based on role"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR public.has_elevated_access(auth.uid())
)
WITH CHECK (
  id = auth.uid()
  OR public.has_elevated_access(auth.uid())
);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Set dharris9928@gmail.com as admin
-- This will update their role when they sign up or if they already exist
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the user ID for dharris9928@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'dharris9928@gmail.com';
  
  -- If user exists, update their role to admin
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (id)
    DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'Admin role set for dharris9928@gmail.com';
  ELSE
    RAISE NOTICE 'User dharris9928@gmail.com not found yet - will be set to admin on signup';
  END IF;
END $$;