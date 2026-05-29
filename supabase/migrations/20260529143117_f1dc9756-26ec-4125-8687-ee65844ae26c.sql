-- Drop the overly broad "Only admins can manage roles" policy (which actually
-- allowed sales_managers too, via has_elevated_access, and let users change their own role).
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Admins can INSERT roles for other users
CREATE POLICY "Admins can insert roles for others"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND user_id <> auth.uid()
);

-- Admins can UPDATE roles for other users (never their own)
CREATE POLICY "Admins can update roles for others"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND user_id <> auth.uid()
);

-- Admins can DELETE roles for other users (never their own)
CREATE POLICY "Admins can delete roles for others"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND user_id <> auth.uid()
);