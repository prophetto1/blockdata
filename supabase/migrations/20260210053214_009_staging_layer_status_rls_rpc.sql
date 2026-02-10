-- Migration 009: Staging layer, expanded status, RLS UPDATE, RPCs, project_id NOT NULL
-- Phase 1 from unified remaining work plan

-- ─── 1.1 Staging columns on block_overlays_v2 (Option A) ───

-- Rename existing column to be the confirmed store
ALTER TABLE block_overlays_v2
  RENAME COLUMN overlay_jsonb TO overlay_jsonb_confirmed;

-- Add staging column (AI writes here)
ALTER TABLE block_overlays_v2
  ADD COLUMN overlay_jsonb_staging JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add confirmation audit columns
ALTER TABLE block_overlays_v2
  ADD COLUMN confirmed_at TIMESTAMPTZ,
  ADD COLUMN confirmed_by UUID REFERENCES auth.users(id);

-- ─── 1.2 Expand overlay status CHECK constraint ───

-- Drop old CHECK
ALTER TABLE block_overlays_v2 DROP CONSTRAINT block_overlays_v2_status_check;

-- Add new CHECK with ai_complete and confirmed (drop legacy 'complete')
ALTER TABLE block_overlays_v2 ADD CONSTRAINT block_overlays_v2_status_check
  CHECK (status IN ('pending', 'claimed', 'ai_complete', 'confirmed', 'failed'));

-- Recreate partial index for pending blocks
DROP INDEX IF EXISTS idx_block_overlays_v2_pending;
CREATE INDEX idx_block_overlays_v2_pending ON block_overlays_v2(run_id, block_uid)
  WHERE status = 'pending';

-- Add index for ai_complete blocks (useful for confirm operations)
CREATE INDEX idx_block_overlays_v2_ai_complete ON block_overlays_v2(run_id, block_uid)
  WHERE status = 'ai_complete';

-- ─── RLS: UPDATE policy for overlay owners ───

CREATE POLICY block_overlays_v2_update_own ON block_overlays_v2
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM runs_v2 r
      WHERE r.run_id = block_overlays_v2.run_id
        AND r.owner_id = auth.uid()
    )
  );

-- ─── RPC: update_overlay_staging (inline editing of staged data) ───

CREATE OR REPLACE FUNCTION public.update_overlay_staging(
  p_run_id UUID,
  p_block_uid TEXT,
  p_staging_jsonb JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.block_overlays_v2
  SET overlay_jsonb_staging = p_staging_jsonb
  WHERE run_id = p_run_id
    AND block_uid = p_block_uid
    AND EXISTS (
      SELECT 1 FROM public.runs_v2 r
      WHERE r.run_id = p_run_id AND r.owner_id = auth.uid()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Overlay not found or not owned by user';
  END IF;
END;
$$;

-- ─── RPC: confirm_overlays (atomic copy staging → confirmed + stamp) ───

CREATE OR REPLACE FUNCTION public.confirm_overlays(
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
  -- Verify run ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.runs_v2
    WHERE run_id = p_run_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Run not found or not owned by user';
  END IF;

  -- If block_uids provided, confirm specific blocks; otherwise confirm all ai_complete
  IF p_block_uids IS NOT NULL THEN
    UPDATE public.block_overlays_v2
    SET overlay_jsonb_confirmed = overlay_jsonb_staging,
        status = 'confirmed',
        confirmed_at = NOW(),
        confirmed_by = auth.uid()
    WHERE run_id = p_run_id
      AND block_uid = ANY(p_block_uids)
      AND status = 'ai_complete';
  ELSE
    UPDATE public.block_overlays_v2
    SET overlay_jsonb_confirmed = overlay_jsonb_staging,
        status = 'confirmed',
        confirmed_at = NOW(),
        confirmed_by = auth.uid()
    WHERE run_id = p_run_id
      AND status = 'ai_complete';
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update run rollup
  UPDATE public.runs_v2
  SET completed_blocks = (
    SELECT COUNT(*) FROM public.block_overlays_v2
    WHERE run_id = p_run_id AND status IN ('ai_complete', 'confirmed')
  )
  WHERE run_id = p_run_id;

  RETURN v_count;
END;
$$;

-- ─── 1.4 Make project_id NOT NULL ───

ALTER TABLE documents_v2 ALTER COLUMN project_id SET NOT NULL;