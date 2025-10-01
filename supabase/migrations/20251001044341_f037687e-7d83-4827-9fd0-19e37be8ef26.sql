-- Drop existing overly permissive RLS policies on company_branches table
DROP POLICY IF EXISTS "Authenticated users can create branches" ON public.company_branches;
DROP POLICY IF EXISTS "Authenticated users can delete branches" ON public.company_branches;
DROP POLICY IF EXISTS "Authenticated users can update branches" ON public.company_branches;
DROP POLICY IF EXISTS "Authenticated users can view branches" ON public.company_branches;

-- Create secure RLS policies that restrict access based on company ownership
-- Users can only view branches for companies they have access to
CREATE POLICY "Users can view branches for their companies"
ON public.company_branches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_branches.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Users can only create branches for companies they have access to
CREATE POLICY "Users can create branches for their companies"
ON public.company_branches
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_branches.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Users can only update branches for companies they have access to
CREATE POLICY "Users can update branches for their companies"
ON public.company_branches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_branches.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_branches.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Only elevated users can delete branches
CREATE POLICY "Elevated users can delete branches"
ON public.company_branches
FOR DELETE
USING (has_elevated_access(auth.uid()));