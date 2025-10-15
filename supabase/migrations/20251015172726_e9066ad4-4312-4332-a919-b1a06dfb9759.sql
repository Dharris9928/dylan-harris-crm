-- Drop the trigger that's causing issues with profiles
-- The trigger is checking for role_frozen field which doesn't exist on profiles
DROP TRIGGER IF EXISTS force_logout_on_freeze ON profiles;

-- Note: This trigger should only be on user_roles table, not profiles
-- If needed for profiles in the future, we'd need to add the role_frozen column first