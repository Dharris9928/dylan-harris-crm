-- Drop the old check constraint
ALTER TABLE public.company_communications 
DROP CONSTRAINT IF EXISTS company_communications_communication_type_check;

-- Add new check constraint with all supported communication types
ALTER TABLE public.company_communications 
ADD CONSTRAINT company_communications_communication_type_check 
CHECK (communication_type = ANY (ARRAY[
  'email'::text, 
  'call_script'::text, 
  'linkedin_message'::text,
  'phone'::text,
  'meeting'::text,
  'demo'::text,
  'training'::text
]));