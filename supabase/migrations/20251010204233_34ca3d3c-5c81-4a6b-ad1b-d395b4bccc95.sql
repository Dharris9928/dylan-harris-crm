-- Fix operation_type to use allowed value 'MIGRATION'
CREATE OR REPLACE FUNCTION public.batch_migrate_contacts_encryption(batch_size integer DEFAULT 100)
RETURNS TABLE(total_migrated integer, total_contacts integer, completion_percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  migrated_count INTEGER := 0;
  remaining_before INTEGER;
  remaining_after INTEGER;
  total_all INTEGER;
  contact_id_to_migrate UUID;
  active_version INTEGER := (SELECT key_version FROM public.encryption_config WHERE is_active = true LIMIT 1);
  t_start TIMESTAMP WITH TIME ZONE := now();
  performer uuid := auth.uid();
BEGIN
  -- Total contacts in the system
  SELECT COUNT(*) INTO total_all FROM public.contacts;

  -- Contacts that still need migration (ignore rows with empty/null fields)
  SELECT COUNT(*) INTO remaining_before
  FROM public.contacts
  WHERE 
    encryption_version IS NULL
    OR (email IS NOT NULL AND email <> '' AND email_encrypted IS NULL)
    OR (phone IS NOT NULL AND phone <> '' AND phone_encrypted IS NULL)
    OR (mobile IS NOT NULL AND mobile <> '' AND mobile_encrypted IS NULL);

  -- Process up to batch_size contacts that still need work
  FOR contact_id_to_migrate IN 
    SELECT id 
    FROM public.contacts
    WHERE 
      encryption_version IS NULL
      OR (email IS NOT NULL AND email <> '' AND email_encrypted IS NULL)
      OR (phone IS NOT NULL AND phone <> '' AND phone_encrypted IS NULL)
      OR (mobile IS NOT NULL AND mobile <> '' AND mobile_encrypted IS NULL)
    LIMIT batch_size
  LOOP
    IF public.migrate_contact_encryption(contact_id_to_migrate) THEN
      migrated_count := migrated_count + 1;
    END IF;
  END LOOP;

  -- Remaining after this batch
  SELECT COUNT(*) INTO remaining_after
  FROM public.contacts
  WHERE 
    encryption_version IS NULL
    OR (email IS NOT NULL AND email <> '' AND email_encrypted IS NULL)
    OR (phone IS NOT NULL AND phone <> '' AND phone_encrypted IS NULL)
    OR (mobile IS NOT NULL AND mobile <> '' AND mobile_encrypted IS NULL);

  -- Log the batch using 'MIGRATION' operation_type (allowed value)
  INSERT INTO public.encryption_audit_log(
    operation_type, status, table_name, record_count, performed_by, encryption_version, metadata
  ) VALUES (
    'MIGRATION',
    'SUCCESS',
    'contacts',
    migrated_count,
    performer,
    active_version,
    jsonb_build_object(
      'batch_size', batch_size,
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
$function$;