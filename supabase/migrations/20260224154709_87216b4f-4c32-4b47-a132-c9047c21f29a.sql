-- Add key_value column to encryption_config to store the actual key
ALTER TABLE public.encryption_config ADD COLUMN IF NOT EXISTS key_value text;

-- Set a secure encryption key for the active config
UPDATE public.encryption_config 
SET key_value = 'nP7k2mX9qR4vB8wY1cF6hJ3tL5sA0dG'
WHERE is_active = true;

-- Update get_encryption_key to read from encryption_config table
CREATE OR REPLACE FUNCTION public.get_encryption_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key TEXT;
BEGIN
  -- First try the GUC parameter
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NOT NULL AND v_key <> '' THEN
    RETURN v_key;
  END IF;

  -- Fall back to encryption_config table
  SELECT key_value INTO v_key
  FROM public.encryption_config
  WHERE is_active = true
  LIMIT 1;

  IF v_key IS NOT NULL AND v_key <> '' THEN
    RETURN v_key;
  END IF;

  RAISE EXCEPTION 'Encryption key not available - cannot proceed. Please configure encryption key.';
END;
$function$;
