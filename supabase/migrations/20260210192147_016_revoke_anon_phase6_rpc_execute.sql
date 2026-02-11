REVOKE EXECUTE ON FUNCTION public.confirm_overlays(UUID, TEXT[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_overlay_staging(UUID, TEXT, JSONB) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_overlays_to_pending(UUID, TEXT[]) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_overlays(UUID, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_overlay_staging(UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_overlays_to_pending(UUID, TEXT[]) TO authenticated, service_role;
