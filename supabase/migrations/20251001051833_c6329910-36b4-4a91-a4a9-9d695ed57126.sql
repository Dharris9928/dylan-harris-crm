-- Add approval status to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- Update existing users to approved status (grandfather existing users)
UPDATE public.profiles
SET approval_status = 'approved',
    approved_at = NOW()
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
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
  )
$$;

-- Create RLS policy for user approval checks
-- Update existing policies to include approval check
CREATE POLICY "Approved users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  is_user_approved(auth.uid()) AND 
  (has_elevated_access(auth.uid()) OR (created_by = auth.uid()))
);

-- Allow admins to view all profiles for approval management
CREATE POLICY "Admins can view all profiles for approval"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_elevated_access(auth.uid()) OR id = auth.uid());

-- Allow admins to update approval status
CREATE POLICY "Admins can update user approval status"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_elevated_access(auth.uid()))
WITH CHECK (has_elevated_access(auth.uid()));