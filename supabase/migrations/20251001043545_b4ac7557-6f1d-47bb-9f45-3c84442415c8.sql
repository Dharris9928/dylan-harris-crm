-- Fix 1: Assign orphaned companies to the first available user
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user from profiles table
  SELECT id INTO first_user_id 
  FROM public.profiles 
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If we have at least one user, assign orphaned companies to them
  IF first_user_id IS NOT NULL THEN
    UPDATE public.companies 
    SET created_by = first_user_id 
    WHERE created_by IS NULL;
  ELSE
    -- If no users exist yet, we can't proceed
    RAISE EXCEPTION 'Cannot enforce data ownership: No users found. Please sign up first.';
  END IF;
END $$;

-- Now make created_by NOT NULL to enforce data ownership going forward
ALTER TABLE public.companies 
ALTER COLUMN created_by SET NOT NULL;