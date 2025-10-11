-- Add encrypted columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS primary_email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS primary_phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Create function to migrate a single company's encryption
CREATE OR REPLACE FUNCTION public.migrate_company_encryption(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  company_record RECORD;
BEGIN
  -- Get the company
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = _company_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Encrypt and update
  UPDATE public.companies
  SET 
    primary_email_encrypted = CASE 
      WHEN primary_email IS NOT NULL AND primary_email != '' 
      THEN public.encrypt_text(primary_email) 
      ELSE NULL 
    END,
    primary_phone_encrypted = CASE 
      WHEN primary_phone IS NOT NULL AND primary_phone != '' 
      THEN public.encrypt_text(primary_phone) 
      ELSE NULL 
    END,
    encryption_version = (SELECT key_version FROM public.encryption_config WHERE is_active = true LIMIT 1)
  WHERE id = _company_id;
  
  RETURN true;
END;
$$;

-- Create batch migration function for companies
CREATE OR REPLACE FUNCTION public.batch_migrate_companies_encryption(_batch_size INTEGER DEFAULT 100)
RETURNS TABLE(
  total_migrated INTEGER,
  total_companies INTEGER,
  completion_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  migrated_count INTEGER := 0;
  remaining_before INTEGER;
  remaining_after INTEGER;
  total_all INTEGER;
  company_id_to_migrate UUID;
  active_version INTEGER := (SELECT key_version FROM public.encryption_config WHERE is_active = true LIMIT 1);
  t_start TIMESTAMP WITH TIME ZONE := now();
  performer UUID := auth.uid();
BEGIN
  -- Total companies in the system
  SELECT COUNT(*) INTO total_all FROM public.companies;

  -- Companies that still need migration (ignore rows with empty/null fields)
  SELECT COUNT(*) INTO remaining_before
  FROM public.companies
  WHERE 
    encryption_version IS NULL
    OR (primary_email IS NOT NULL AND primary_email <> '' AND primary_email_encrypted IS NULL)
    OR (primary_phone IS NOT NULL AND primary_phone <> '' AND primary_phone_encrypted IS NULL);

  -- Process up to batch_size companies that still need work
  FOR company_id_to_migrate IN 
    SELECT id 
    FROM public.companies
    WHERE 
      encryption_version IS NULL
      OR (primary_email IS NOT NULL AND primary_email <> '' AND primary_email_encrypted IS NULL)
      OR (primary_phone IS NOT NULL AND primary_phone <> '' AND primary_phone_encrypted IS NULL)
    LIMIT _batch_size
  LOOP
    IF public.migrate_company_encryption(company_id_to_migrate) THEN
      migrated_count := migrated_count + 1;
    END IF;
  END LOOP;

  -- Remaining after this batch
  SELECT COUNT(*) INTO remaining_after
  FROM public.companies
  WHERE 
    encryption_version IS NULL
    OR (primary_email IS NOT NULL AND primary_email <> '' AND primary_email_encrypted IS NULL)
    OR (primary_phone IS NOT NULL AND primary_phone <> '' AND primary_phone_encrypted IS NULL);

  -- Log the batch using 'MIGRATION' operation_type
  INSERT INTO public.encryption_audit_log(
    operation_type, status, table_name, record_count, performed_by, encryption_version, metadata
  ) VALUES (
    'MIGRATION',
    'SUCCESS',
    'companies',
    migrated_count,
    performer,
    active_version,
    jsonb_build_object(
      'batch_size', _batch_size,
      'remaining_before', remaining_before,
      'remaining_after', remaining_after,
      'duration_ms', EXTRACT(EPOCH FROM (now() - t_start)) * 1000
    )
  );

  -- Overall completion: based on total_all and remaining_after
  RETURN QUERY
  SELECT 
    migrated_count,
    total_all,
    CASE 
      WHEN total_all > 0 
      THEN ROUND(((total_all - remaining_after)::NUMERIC / total_all::NUMERIC) * 100, 2)
      ELSE 100.0
    END;
END;
$$;

-- Create decrypted view for companies
CREATE OR REPLACE VIEW public.companies_decrypted AS
SELECT 
  id,
  company_name,
  industry_type,
  CASE 
    WHEN primary_email_encrypted IS NOT NULL 
    THEN public.decrypt_text(primary_email_encrypted)
    ELSE primary_email
  END AS primary_email,
  CASE 
    WHEN primary_phone_encrypted IS NOT NULL 
    THEN public.decrypt_text(primary_phone_encrypted)
    ELSE primary_phone
  END AS primary_phone,
  address_line1,
  city,
  state,
  zip,
  website_url,
  linkedin_company_url,
  status,
  segment,
  priority_tier,
  lead_score,
  annual_revenue_range,
  total_employees,
  years_in_business,
  encryption_version,
  created_by,
  assigned_to,
  assigned_to_sales_rep_id,
  created_at,
  updated_at
FROM public.companies;

-- Auto-encrypt trigger for companies on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.auto_encrypt_company_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  active_key_version INTEGER;
BEGIN
  -- Get active encryption key version
  SELECT key_version INTO active_key_version
  FROM public.encryption_config
  WHERE is_active = true
  LIMIT 1;

  -- Encrypt primary_email if provided and not already encrypted
  IF NEW.primary_email IS NOT NULL AND NEW.primary_email != '' THEN
    NEW.primary_email_encrypted := public.encrypt_text(NEW.primary_email);
  END IF;

  -- Encrypt primary_phone if provided and not already encrypted
  IF NEW.primary_phone IS NOT NULL AND NEW.primary_phone != '' THEN
    NEW.primary_phone_encrypted := public.encrypt_text(NEW.primary_phone);
  END IF;

  -- Set encryption version
  NEW.encryption_version := active_key_version;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-encryption on INSERT
CREATE TRIGGER encrypt_company_on_insert
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.auto_encrypt_company_fields();

-- Create trigger for auto-encryption on UPDATE
CREATE TRIGGER encrypt_company_on_update
BEFORE UPDATE ON public.companies
FOR EACH ROW
WHEN (
  NEW.primary_email IS DISTINCT FROM OLD.primary_email OR
  NEW.primary_phone IS DISTINCT FROM OLD.primary_phone
)
EXECUTE FUNCTION public.auto_encrypt_company_fields();

COMMENT ON COLUMN public.companies.primary_email_encrypted IS 'AES-256 encrypted primary email';
COMMENT ON COLUMN public.companies.primary_phone_encrypted IS 'AES-256 encrypted primary phone';
COMMENT ON VIEW public.companies_decrypted IS 'Transparent decryption view for companies with encrypted fields';