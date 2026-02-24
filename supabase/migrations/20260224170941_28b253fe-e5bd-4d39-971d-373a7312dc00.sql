-- Drop views first
DROP VIEW IF EXISTS public.companies_decrypted CASCADE;
DROP VIEW IF EXISTS public.companies_financial_masked CASCADE;

-- Drop trigger
DROP TRIGGER IF EXISTS set_region_from_state ON public.companies;

-- Alter column
ALTER TABLE public.companies ALTER COLUMN state TYPE varchar(100);

-- Recreate trigger
CREATE TRIGGER set_region_from_state BEFORE INSERT OR UPDATE OF state ON public.companies FOR EACH ROW EXECUTE FUNCTION auto_assign_region();

-- Recreate companies_decrypted view
CREATE VIEW public.companies_decrypted AS
SELECT id, company_name, industry_type, segment, website_url,
  CASE WHEN can_access_field(auth.uid(), 'companies', 'primary_email') 
    THEN COALESCE(decrypt_text(primary_email_encrypted), primary_email::text)
    ELSE mask_pii_field(primary_email::text, 'companies', 'primary_email')
  END AS primary_email,
  CASE WHEN can_access_field(auth.uid(), 'companies', 'primary_phone')
    THEN COALESCE(decrypt_text(primary_phone_encrypted), primary_phone)
    ELSE mask_pii_field(primary_phone, 'companies', 'primary_phone')
  END AS primary_phone,
  address_line1, city, state, zip, status, annual_revenue_range, priority_tier, lead_score,
  linkedin_company_url, created_by, assigned_to, assigned_to_sales_rep_id,
  years_in_business, total_employees, encryption_version, created_at, updated_at
FROM companies
WHERE auth.uid() IS NOT NULL AND is_user_approved(auth.uid())
  AND (has_elevated_access(auth.uid()) OR created_by = auth.uid() OR assigned_to = auth.uid());

-- Recreate companies_financial_masked view
CREATE VIEW public.companies_financial_masked AS
SELECT id, company_name, industry_type, annual_revenue_range,
  financial_health_rating, profitability_level, created_at, updated_at
FROM companies
WHERE auth.uid() IS NOT NULL AND is_user_approved(auth.uid())
  AND (has_elevated_access(auth.uid()) OR created_by = auth.uid());