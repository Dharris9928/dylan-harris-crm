-- Add RLS policies to decrypted views for security

-- Enable RLS on decrypted views
ALTER VIEW public.contacts_decrypted SET (security_barrier = true);
ALTER VIEW public.contacts_decrypted_secure SET (security_barrier = true);
ALTER VIEW public.companies_decrypted SET (security_barrier = true);
ALTER VIEW public.contacts_masked SET (security_barrier = true);
ALTER VIEW public.companies_financial_masked SET (security_barrier = true);

-- Since views don't support RLS directly, we need to recreate them with proper permissions
-- Drop and recreate contacts_decrypted with security invoker
DROP VIEW IF EXISTS public.contacts_decrypted CASCADE;
CREATE VIEW public.contacts_decrypted
WITH (security_invoker = true)
AS
SELECT 
  id,
  company_id,
  branch_id,
  first_name,
  last_name,
  title,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'email') 
    THEN COALESCE(decrypt_text(email_encrypted), email)
    ELSE mask_pii_field(email, 'contacts', 'email')
  END as email,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'phone') 
    THEN COALESCE(decrypt_text(phone_encrypted), phone)
    ELSE mask_pii_field(phone, 'contacts', 'phone')
  END as phone,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'mobile') 
    THEN COALESCE(decrypt_text(mobile_encrypted), mobile)
    ELSE mask_pii_field(mobile, 'contacts', 'mobile')
  END as mobile,
  linkedin_url,
  notes,
  preferred_contact_method,
  decision_tier,
  linkedin_connections,
  linkedin_activity_score,
  encryption_version,
  created_at,
  updated_at
FROM public.contacts
WHERE 
  -- Apply same RLS logic as contacts table
  (auth.uid() IS NOT NULL) 
  AND is_user_approved(auth.uid()) 
  AND (
    has_elevated_access(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = contacts.company_id 
      AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())
    )
  );

-- Drop and recreate contacts_decrypted_secure (for admin-only access)
DROP VIEW IF EXISTS public.contacts_decrypted_secure CASCADE;
CREATE VIEW public.contacts_decrypted_secure
WITH (security_invoker = true)
AS
SELECT 
  id,
  company_id,
  branch_id,
  first_name,
  last_name,
  title,
  COALESCE(decrypt_text(email_encrypted), email) as email,
  COALESCE(decrypt_text(phone_encrypted), phone) as phone,
  COALESCE(decrypt_text(mobile_encrypted), mobile) as mobile,
  linkedin_url,
  notes,
  preferred_contact_method,
  decision_tier,
  linkedin_connections,
  linkedin_activity_score,
  encryption_version,
  created_at,
  updated_at
FROM public.contacts
WHERE has_elevated_access(auth.uid());

-- Drop and recreate companies_decrypted with security invoker
DROP VIEW IF EXISTS public.companies_decrypted CASCADE;
CREATE VIEW public.companies_decrypted
WITH (security_invoker = true)
AS
SELECT 
  id,
  company_name,
  industry_type,
  segment,
  website_url,
  CASE 
    WHEN can_access_field(auth.uid(), 'companies', 'primary_email') 
    THEN COALESCE(decrypt_text(primary_email_encrypted), primary_email)
    ELSE mask_pii_field(primary_email, 'companies', 'primary_email')
  END as primary_email,
  CASE 
    WHEN can_access_field(auth.uid(), 'companies', 'primary_phone') 
    THEN COALESCE(decrypt_text(primary_phone_encrypted), primary_phone)
    ELSE mask_pii_field(primary_phone, 'companies', 'primary_phone')
  END as primary_phone,
  address_line1,
  city,
  state,
  zip,
  status,
  annual_revenue_range,
  priority_tier,
  lead_score,
  linkedin_company_url,
  created_by,
  assigned_to,
  assigned_to_sales_rep_id,
  years_in_business,
  total_employees,
  encryption_version,
  created_at,
  updated_at
FROM public.companies
WHERE 
  (auth.uid() IS NOT NULL)
  AND is_user_approved(auth.uid()) 
  AND (
    has_elevated_access(auth.uid()) 
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Drop and recreate contacts_masked with proper access control
DROP VIEW IF EXISTS public.contacts_masked CASCADE;
CREATE VIEW public.contacts_masked
WITH (security_invoker = true)
AS
SELECT 
  id,
  company_id,
  branch_id,
  first_name,
  last_name,
  title,
  mask_pii_field(COALESCE(decrypt_text(email_encrypted), email), 'contacts', 'email') as email,
  mask_pii_field(COALESCE(decrypt_text(phone_encrypted), phone), 'contacts', 'phone') as phone,
  mask_pii_field(COALESCE(decrypt_text(mobile_encrypted), mobile), 'contacts', 'mobile') as mobile,
  linkedin_url,
  notes,
  preferred_contact_method,
  decision_tier,
  linkedin_connections,
  linkedin_activity_score,
  created_at,
  updated_at
FROM public.contacts
WHERE 
  (auth.uid() IS NOT NULL)
  AND is_user_approved(auth.uid());

-- Drop and recreate companies_financial_masked with proper access control
DROP VIEW IF EXISTS public.companies_financial_masked CASCADE;
CREATE VIEW public.companies_financial_masked
WITH (security_invoker = true)
AS
SELECT 
  id,
  company_name,
  industry_type,
  annual_revenue_range,
  financial_health_rating,
  profitability_level,
  created_at,
  updated_at
FROM public.companies
WHERE 
  (auth.uid() IS NOT NULL)
  AND is_user_approved(auth.uid())
  AND (
    has_elevated_access(auth.uid()) 
    OR created_by = auth.uid()
  );

-- Grant appropriate permissions
GRANT SELECT ON public.contacts_decrypted TO authenticated;
GRANT SELECT ON public.contacts_decrypted_secure TO authenticated;
GRANT SELECT ON public.companies_decrypted TO authenticated;
GRANT SELECT ON public.contacts_masked TO authenticated;
GRANT SELECT ON public.companies_financial_masked TO authenticated;