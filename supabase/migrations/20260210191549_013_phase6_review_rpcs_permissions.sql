CREATE OR REPLACE FUNCTION public.reject_overlays_to_pending(
  p_run_id UUID,
  p_block_uids TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.runs_v2
    WHERE run_id = p_run_id
      AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Run not found or not owned by user';
  END IF;

  IF p_block_uids IS NOT NULL THEN
    UPDATE public.block_overlays_v2
    SET status = 'pending',
        claimed_by = NULL,
        claimed_at = NULL,
        last_error = NULL
    WHERE run_id = p_run_id
      AND block_uid = ANY(p_block_uids)
      AND status = 'ai_complete';
  ELSE
    UPDATE public.block_overlays_v2
    SET status = 'pending',
        claimed_by = NULL,
        claimed_at = NULL,
        last_error = NULL
    WHERE run_id = p_run_id
      AND status = 'ai_complete';
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.runs_v2
  SET completed_blocks = (
        SELECT COUNT(*)
        FROM public.block_overlays_v2
        WHERE run_id = p_run_id
          AND status IN ('ai_complete', 'confirmed')
      ),
      status = CASE
        WHEN status = 'cancelled' THEN status
        WHEN v_count > 0 THEN 'running'
        ELSE status
      END,
      completed_at = CASE
        WHEN status = 'cancelled' THEN completed_at
        WHEN v_count > 0 THEN NULL
        ELSE completed_at
      END
  WHERE run_id = p_run_id;

  RETURN v_count;
END;
$$;

REVOKE UPDATE ON TABLE public.block_overlays_v2 FROM authenticated;
GRANT UPDATE (overlay_jsonb_staging) ON TABLE public.block_overlays_v2 TO authenticated;
