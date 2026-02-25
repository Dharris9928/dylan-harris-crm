
-- Add assigned_to column to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

-- Backfill existing contacts: set assigned_to from the company's created_by
UPDATE public.contacts c
SET assigned_to = comp.created_by
FROM public.companies comp
WHERE c.company_id = comp.id AND c.assigned_to IS NULL;

-- Create trigger to auto-populate assigned_to on insert
CREATE OR REPLACE FUNCTION public.auto_assign_contact_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NULL THEN
    NEW.assigned_to := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_contact_assigned_to
BEFORE INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_contact_to_user();
