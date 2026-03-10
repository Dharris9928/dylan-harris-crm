
-- Fix 2: Recreate decrypted contact views as SECURITY INVOKER
-- This ensures RLS on the underlying 'contacts' table is enforced for the calling user

-- Drop and recreate contacts_decrypted_secure as SECURITY INVOKER
DROP VIEW IF EXISTS public.contacts_decrypted_secure;
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
    COALESCE(decrypt_text(email_encrypted), email) AS email,
    COALESCE(decrypt_text(phone_encrypted), phone) AS phone,
    COALESCE(decrypt_text(mobile_encrypted), mobile) AS mobile,
    linkedin_url,
    notes,
    preferred_contact_method,
    decision_tier,
    linkedin_connections,
    linkedin_activity_score,
    encryption_version,
    created_at,
    updated_at
FROM contacts
WHERE has_elevated_access(auth.uid());

-- Drop and recreate contacts_decrypted as SECURITY INVOKER
DROP VIEW IF EXISTS public.contacts_decrypted;
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
        WHEN can_access_field(auth.uid(), 'contacts'::text, 'email'::text) THEN COALESCE(decrypt_text(email_encrypted), email)
        ELSE mask_pii_field(email, 'contacts'::text, 'email'::text)
    END AS email,
    CASE
        WHEN can_access_field(auth.uid(), 'contacts'::text, 'phone'::text) THEN COALESCE(decrypt_text(phone_encrypted), phone)
        ELSE mask_pii_field(phone, 'contacts'::text, 'phone'::text)
    END AS phone,
    CASE
        WHEN can_access_field(auth.uid(), 'contacts'::text, 'mobile'::text) THEN COALESCE(decrypt_text(mobile_encrypted), mobile)
        ELSE mask_pii_field(mobile, 'contacts'::text, 'mobile'::text)
    END AS mobile,
    linkedin_url,
    notes,
    preferred_contact_method,
    decision_tier,
    linkedin_connections,
    linkedin_activity_score,
    encryption_version,
    created_at,
    updated_at
FROM contacts
WHERE (auth.uid() IS NOT NULL)
  AND is_user_approved(auth.uid())
  AND (has_elevated_access(auth.uid()) OR EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = contacts.company_id
    AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())
  ));
