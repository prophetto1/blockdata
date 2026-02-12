-- Ensure deterministic numeric claim ordering by block_index for batching correctness.

CREATE OR REPLACE FUNCTION public.claim_overlay_batch(
  p_run_id UUID,
  p_batch_size INTEGER,
  p_worker_id TEXT
)
RETURNS TABLE(run_id UUID, block_uid TEXT)
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT bo.run_id, bo.block_uid
    FROM public.block_overlays_v2 bo
    JOIN public.blocks_v2 b
      ON b.block_uid = bo.block_uid
    WHERE bo.run_id = p_run_id
      AND bo.status = 'pending'
    ORDER BY b.block_index ASC, bo.block_uid ASC
    LIMIT p_batch_size
    FOR UPDATE OF bo SKIP LOCKED
  )
  UPDATE public.block_overlays_v2 bo
  SET status = 'claimed', claimed_by = p_worker_id, claimed_at = NOW()
  FROM claimable c
  WHERE bo.run_id = c.run_id
    AND bo.block_uid = c.block_uid
  RETURNING bo.run_id, bo.block_uid;
END;
$$;
