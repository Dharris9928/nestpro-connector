
REVOKE EXECUTE ON FUNCTION public.user_owns_company(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_activity(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_activity_strict(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_communication(uuid) FROM anon, PUBLIC;
