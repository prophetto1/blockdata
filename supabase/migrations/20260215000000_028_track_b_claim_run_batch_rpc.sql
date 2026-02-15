-- Migration 028: Track B worker dequeue RPC (atomic run claims)

CREATE OR REPLACE FUNCTION public.claim_unstructured_run_batch(
  p_batch_size INTEGER,
  p_worker_id TEXT
)
RETURNS TABLE(run_uid UUID)
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_batch_size INTEGER;
BEGIN
  v_batch_size := GREATEST(1, LEAST(COALESCE(p_batch_size, 1), 20));

  RETURN QUERY
  WITH claimable AS (
    SELECT r.run_uid
    FROM public.unstructured_workflow_runs_v2 r
    WHERE r.status = 'queued'
    ORDER BY r.created_at, r.run_uid
    LIMIT v_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.unstructured_workflow_runs_v2 r
  SET status = 'running',
      started_at = COALESCE(r.started_at, NOW())
  FROM claimable c
  WHERE r.run_uid = c.run_uid
  RETURNING r.run_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_unstructured_run_batch(INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_unstructured_run_batch(INTEGER, TEXT) TO service_role;
