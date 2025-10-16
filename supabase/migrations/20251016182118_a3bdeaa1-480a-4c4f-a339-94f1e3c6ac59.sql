-- Fix security issues identified in security scan
-- Focus on strengthening table policies (views inherit from tables)

-- 1. Fix profiles table - require authentication for SELECT
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile - authenticated only"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY "Admins can view all profiles - authenticated only"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- 2. Strengthen sales_reps table policies
DROP POLICY IF EXISTS "Authenticated users can view sales reps" ON public.sales_reps;

CREATE POLICY "Authenticated users can view sales reps - secure"
ON public.sales_reps FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_user_approved(auth.uid()));

-- 3. Add security definer function for secure contact decryption access
CREATE OR REPLACE FUNCTION public.can_access_contact_decrypted(_contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_company_id uuid;
BEGIN
  -- Get the company_id for the contact
  SELECT company_id INTO contact_company_id
  FROM public.contacts
  WHERE id = _contact_id;
  
  -- Check if user has elevated access or owns the company
  RETURN has_elevated_access(auth.uid()) OR
         EXISTS (
           SELECT 1 FROM public.companies
           WHERE id = contact_company_id
           AND (created_by = auth.uid() OR assigned_to = auth.uid())
         );
END;
$$;

-- 4. Add security definer function for secure company decryption access
CREATE OR REPLACE FUNCTION public.can_access_company_decrypted(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN has_elevated_access(auth.uid()) OR
         EXISTS (
           SELECT 1 FROM public.companies
           WHERE id = _company_id
           AND (created_by = auth.uid() OR assigned_to = auth.uid())
         );
END;
$$;

-- 5. Comment on views to document security model
COMMENT ON VIEW public.companies_decrypted IS 
  'Decrypted company data - inherits RLS from companies table. Use can_access_company_decrypted() for additional checks.';

COMMENT ON VIEW public.contacts_decrypted IS 
  'Decrypted contact data - inherits RLS from contacts table. Use can_access_contact_decrypted() for additional checks.';

COMMENT ON VIEW public.contacts_masked IS 
  'Masked contact data - inherits RLS from contacts table. Used for users without full field permissions.';

COMMENT ON VIEW public.companies_financial_masked IS 
  'Masked company financial data - inherits RLS from companies table. Restricted to elevated users only.';