-- Update handle_new_user to use domain allowlist
-- This migration updates the signup trigger to check against the allowed_email_domains table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_email text;
  is_admin_exception boolean;
  email_domain text;
  is_domain_allowed boolean;
  user_role app_role;
  user_approval approval_status;
BEGIN
  user_email := lower(new.email);
  email_domain := split_part(user_email, '@', 2);
  
  -- Check if this is the admin exception email
  is_admin_exception := (user_email = 'dharris9928@gmail.com');
  
  -- Check if email domain is allowed
  is_domain_allowed := public.check_email_domain_allowed(user_email);
  
  -- Reject signup if domain is not allowed (unless admin exception)
  IF NOT is_domain_allowed AND NOT is_admin_exception THEN
    -- Log the blocked attempt
    PERFORM public.log_blocked_signup(
      user_email,
      'Unauthorized domain: ' || email_domain || ' not in allowed domains list',
      false,
      NULL::inet,
      jsonb_build_object('user_id', new.id, 'signup_method', 'email')
    );
    
    RAISE EXCEPTION 'Registration restricted to authorized email domains only. Domain "%" is not authorized.', email_domain;
  END IF;
  
  -- Determine role and approval status
  IF is_admin_exception THEN
    user_role := 'admin'::app_role;
    user_approval := 'approved'::approval_status;
  ELSE
    user_role := 'sales_rep'::app_role;
    user_approval := 'pending'::approval_status;
  END IF;
  
  -- Insert profile with appropriate approval status
  INSERT INTO public.profiles (id, first_name, last_name, approval_status, approved_at)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    user_approval,
    CASE WHEN is_admin_exception THEN now() ELSE NULL END
  );
  
  -- Insert role (admin for exception, sales_rep for others)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role);
  
  RETURN new;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user IS 
'Enhanced signup trigger that validates email domains against allowed_email_domains table and logs blocked attempts for security monitoring.';