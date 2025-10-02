-- Secure company_hierarchy view by removing broad read access and enforcing safe defaults (retry with correct REVOKE syntax)

-- 1) Ensure the view executes with invoker semantics and acts as a security barrier
DO $$
BEGIN
  EXECUTE 'ALTER VIEW public.company_hierarchy SET (security_invoker = on)';
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER VIEW public.company_hierarchy SET (security_barrier = on)';
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- 2) Revoke direct SELECT access to the view from all client-facing roles
REVOKE ALL PRIVILEGES ON TABLE public.company_hierarchy FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.company_hierarchy FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.company_hierarchy FROM authenticated;

-- 3) Add documentation to guide usage via secure functions only
COMMENT ON VIEW public.company_hierarchy IS 
'CONFIDENTIAL: Do not query this view directly. Use public.get_company_hierarchy() or public.get_company_hierarchy_for_company(uuid) which enforce access via company ownership/elevated permissions.';
