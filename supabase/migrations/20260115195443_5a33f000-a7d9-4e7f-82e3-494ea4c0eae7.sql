-- Add assigned_to column to company_communications for handoff tracking
ALTER TABLE public.company_communications 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_communications_assigned_to 
ON public.company_communications(assigned_to);

-- Update RLS policies to allow users to update assigned_to field
DROP POLICY IF EXISTS "Users can update communications assigned to them" ON public.company_communications;

CREATE POLICY "Users can update communications assigned to them" 
ON public.company_communications 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR auth.uid() = assigned_to 
  OR has_elevated_access(auth.uid())
);