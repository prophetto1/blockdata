-- Explicitly revoke anon execute on user_api_keys RPCs.

REVOKE EXECUTE ON FUNCTION public.save_api_key(text, text, text, text, numeric, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_api_key_defaults(text, text, numeric, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_api_key(text) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_api_key(text, text, text, text, numeric, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_api_key_defaults(text, text, numeric, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_api_key(text) TO authenticated, service_role;
