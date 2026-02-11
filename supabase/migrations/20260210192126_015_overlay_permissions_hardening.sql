REVOKE UPDATE ON TABLE public.block_overlays_v2 FROM anon;

REVOKE UPDATE ON TABLE public.block_overlays_v2 FROM authenticated;
GRANT UPDATE (overlay_jsonb_staging) ON TABLE public.block_overlays_v2 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.confirm_overlays(UUID, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_overlay_staging(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_overlays_to_pending(UUID, TEXT[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_overlays(UUID, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_overlay_staging(UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_overlays_to_pending(UUID, TEXT[]) TO authenticated, service_role;
