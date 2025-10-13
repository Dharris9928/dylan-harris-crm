-- Add expiration and activity tracking to user_roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS review_required_by TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reviewed_by UUID REFERENCES auth.users(id);

-- Create access reviews table for tracking review cycles
CREATE TABLE IF NOT EXISTS public.access_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  review_type TEXT NOT NULL CHECK (review_type IN ('quarterly', 'role_change', 'manager_review', 'recertification')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked', 'modified')),
  previous_role app_role,
  new_role app_role,
  access_expires_at TIMESTAMPTZ,
  justification TEXT,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT valid_review CHECK (
    (status = 'pending' AND reviewed_at IS NULL) OR
    (status != 'pending' AND reviewed_at IS NOT NULL)
  )
);

ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_access_reviews_user_status ON public.access_reviews(user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_reviews_reviewer ON public.access_reviews(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_user_roles_expiration ON public.user_roles(access_expires_at) WHERE access_expires_at IS NOT NULL;

-- RLS policies for access_reviews
CREATE POLICY "Users can view their own access reviews"
ON public.access_reviews FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

CREATE POLICY "Admins and managers can create access reviews"
ON public.access_reviews FOR INSERT
TO authenticated
WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Reviewers can update their assigned reviews"
ON public.access_reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid() OR has_role(auth.uid(), 'admin'))
WITH CHECK (reviewer_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Function to check if a role is active (not expired)
CREATE OR REPLACE FUNCTION public.is_role_active(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
    AND (access_expires_at IS NULL OR access_expires_at > NOW())
  )
$$;

-- Function to revoke expired access automatically
CREATE OR REPLACE FUNCTION public.revoke_expired_access()
RETURNS TABLE(revoked_user_id UUID, revoked_role app_role, expired_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.user_roles
  WHERE access_expires_at IS NOT NULL 
  AND access_expires_at < NOW()
  RETURNING user_id, role, access_expires_at;
  
  -- Log the revocations
  RAISE NOTICE 'Revoked % expired role assignments', 
    (SELECT COUNT(*) FROM public.user_roles WHERE access_expires_at < NOW());
END;
$$;

-- Function to detect orphaned/inactive accounts
CREATE OR REPLACE FUNCTION public.detect_inactive_users(_days_inactive INTEGER DEFAULT 90)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role app_role,
  last_activity TIMESTAMPTZ,
  days_inactive INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.user_id,
    au.email::TEXT,
    ur.role,
    ur.last_activity_at,
    EXTRACT(DAY FROM NOW() - ur.last_activity_at)::INTEGER
  FROM public.user_roles ur
  JOIN auth.users au ON ur.user_id = au.id
  WHERE ur.last_activity_at < NOW() - (_days_inactive || ' days')::INTERVAL
  OR ur.last_activity_at IS NULL
  ORDER BY ur.last_activity_at ASC NULLS FIRST;
END;
$$;

-- Trigger to update last_activity_at when user_roles is accessed
CREATE OR REPLACE FUNCTION public.update_role_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_activity_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_role_activity
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_role_activity();