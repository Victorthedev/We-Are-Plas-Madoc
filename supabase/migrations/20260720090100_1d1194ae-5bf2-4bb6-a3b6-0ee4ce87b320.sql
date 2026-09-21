-- Multi-role support: a user may now hold more than one row in user_roles
-- (e.g. both 'editor' and 'playground_worker'). get_user_role() (singular,
-- LIMIT 1) is kept in place for now so an in-flight deploy of the old
-- frontend bundle doesn't break; it will be retired in a later cleanup
-- once the new frontend calling get_user_roles() is confirmed live.
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;
