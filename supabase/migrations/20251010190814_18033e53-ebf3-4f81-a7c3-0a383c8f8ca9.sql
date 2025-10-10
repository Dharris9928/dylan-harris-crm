-- Drop the existing view
DROP VIEW IF EXISTS public.contacts_decrypted;

-- Recreate the view with security_invoker to inherit RLS from contacts table
CREATE VIEW public.contacts_decrypted
WITH (security_invoker = true, security_barrier = true)
AS
SELECT 
  id,
  company_id,
  branch_id,
  first_name,
  last_name,
  title,
  -- Decrypt PII fields if encrypted, otherwise use plain text
  COALESCE(
    CASE 
      WHEN email_encrypted IS NOT NULL AND email_encrypted != '' 
      THEN public.decrypt_text(email_encrypted)
      ELSE email
    END,
    email
  ) as email,
  COALESCE(
    CASE 
      WHEN phone_encrypted IS NOT NULL AND phone_encrypted != '' 
      THEN public.decrypt_text(phone_encrypted)
      ELSE phone
    END,
    phone
  ) as phone,
  COALESCE(
    CASE 
      WHEN mobile_encrypted IS NOT NULL AND mobile_encrypted != '' 
      THEN public.decrypt_text(mobile_encrypted)
      ELSE mobile
    END,
    mobile
  ) as mobile,
  linkedin_url,
  notes,
  preferred_contact_method,
  decision_tier,
  linkedin_activity_score,
  linkedin_connections,
  encryption_version,
  created_at,
  updated_at
FROM public.contacts;

-- Add helpful comment
COMMENT ON VIEW public.contacts_decrypted IS 
'Secure view of contacts with decrypted PII. Inherits all RLS policies from the contacts table via security_invoker=true.';