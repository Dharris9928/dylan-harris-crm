-- Company Hierarchy Security Hardening
-- 
-- SECURITY MODEL:
-- The company_hierarchy view implements security through:
-- 1. security_barrier = true ensures RLS on underlying companies table is respected
-- 2. Direct SELECT access is revoked - users must use security functions
-- 3. Functions get_company_hierarchy() and get_company_hierarchy_for_company() 
--    filter results based on user permissions via the companies table RLS
--
-- This prevents unauthorized access to company organizational structures.

-- Explicitly revoke all direct access from roles
REVOKE ALL ON company_hierarchy FROM PUBLIC;
REVOKE ALL ON company_hierarchy FROM anon;
REVOKE ALL ON company_hierarchy FROM authenticated;

-- Grant SELECT only to service_role (for admin/system operations)
GRANT SELECT ON company_hierarchy TO service_role;

-- Ensure security_barrier is enabled (prevents RLS bypass)
ALTER VIEW company_hierarchy SET (security_barrier = true);

-- Grant EXECUTE permission on the security functions to authenticated users
-- These functions properly filter results based on user permissions
GRANT EXECUTE ON FUNCTION public.get_company_hierarchy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_hierarchy_for_company(uuid) TO authenticated;

-- Add comment documenting the security model
COMMENT ON VIEW company_hierarchy IS 
'Security: Direct access revoked. Use get_company_hierarchy() or get_company_hierarchy_for_company() functions which enforce user permissions via companies table RLS.';