-- Step 1: Drop existing restrictive SELECT policies on companies
DROP POLICY IF EXISTS "Approved users can view companies" ON companies;
DROP POLICY IF EXISTS "Elevated users can view all companies" ON companies;
DROP POLICY IF EXISTS "Sales reps can view their companies - authenticated only" ON companies;
DROP POLICY IF EXISTS "Read only users can view their companies - authenticated only" ON companies;
DROP POLICY IF EXISTS "Assigned users can view their companies - authenticated only" ON companies;
DROP POLICY IF EXISTS "Users can view companies based on role" ON companies;

-- Step 2: Create new permissive SELECT policy for all authenticated users
CREATE POLICY "All authenticated users can view all companies"
ON companies
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_user_approved(auth.uid())
);

-- Step 3: Add field permissions for sensitive company fields
INSERT INTO field_permissions (table_name, field_name, min_role_required, is_pii, masking_pattern)
VALUES
  ('companies', 'primary_email', 'sales_manager', true, 'email'),
  ('companies', 'primary_phone', 'sales_manager', true, 'phone'),
  ('companies', 'primary_email_encrypted', 'sales_manager', true, 'email'),
  ('companies', 'primary_phone_encrypted', 'sales_manager', true, 'phone'),
  ('companies', 'website_url', 'sales_rep', false, null),
  ('companies', 'linkedin_company_url', 'sales_rep', false, null),
  ('companies', 'address_line1', 'sales_rep', false, null),
  ('companies', 'city', 'sales_rep', false, null),
  ('companies', 'state', 'sales_rep', false, null),
  ('companies', 'zip', 'sales_rep', false, null),
  ('companies', 'notes', 'sales_rep', false, null),
  ('companies', 'annual_revenue_range', 'sales_rep', false, null),
  ('companies', 'annual_volume', 'sales_rep', false, null),
  ('companies', 'annual_volume_range', 'sales_rep', false, null),
  ('companies', 'total_employees', 'sales_rep', false, null),
  ('companies', 'total_employees_range', 'sales_rep', false, null),
  ('companies', 'years_in_business', 'sales_rep', false, null),
  ('companies', 'years_in_business_range', 'sales_rep', false, null),
  ('companies', 'average_home_price', 'sales_rep', false, null),
  ('companies', 'average_home_price_range', 'sales_rep', false, null)
ON CONFLICT (table_name, field_name) DO UPDATE
SET min_role_required = EXCLUDED.min_role_required,
    is_pii = EXCLUDED.is_pii,
    masking_pattern = EXCLUDED.masking_pattern;