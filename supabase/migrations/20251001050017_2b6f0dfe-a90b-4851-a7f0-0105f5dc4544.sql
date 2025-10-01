-- Update dwayneharris@google.com user to admin role
UPDATE public.profiles 
SET role = 'admin'::app_role
WHERE id = '5c013a0d-d7c1-4404-8dbc-adcada71ce40';