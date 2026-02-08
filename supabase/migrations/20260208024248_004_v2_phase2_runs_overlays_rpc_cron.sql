-- Migration 004: v2 Phase 2 tables + RPC + RLS + pg_cron
-- Applied: 2026-02-08
-- Covers checklist Steps 3-6:
--   Step 3: runs_v2 + block_overlays_v2 tables
--   Step 4: create_run_v2 RPC function
--   Step 5: RLS policies for v2 Phase 2 tables
--   Step 6: pg_cron stale conversion cleanup for documents_v2
-- Also fixes: set_updated_at search_path security advisory

-- Step 3a: runs_v2
CREATE TABLE runs_v2 (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  conv_uid TEXT NOT NULL REFERENCES documents_v2(conv_uid),
  schema_id UUID NOT NULL REFERENCES schemas(schema_id),
  model_config JSONB,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'complete', 'failed', 'cancelled')),
  total_blocks INTEGER NOT NULL
    CHECK (total_blocks >= 0),
  completed_blocks INTEGER NOT NULL DEFAULT 0
    CHECK (completed_blocks >= 0),
  failed_blocks INTEGER NOT NULL DEFAULT 0
    CHECK (failed_blocks >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  failure_log JSONB DEFAULT '[]'::jsonb
);

-- Step 3b: block_overlays_v2
CREATE TABLE block_overlays_v2 (
  run_id UUID NOT NULL REFERENCES runs_v2(run_id),
  block_uid TEXT NOT NULL REFERENCES blocks_v2(block_uid),
  overlay_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'complete', 'failed')),
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),
  last_error TEXT,
  PRIMARY KEY (run_id, block_uid)
);

-- Step 3: Indexes
CREATE INDEX idx_runs_v2_owner_started ON runs_v2(owner_id, started_at DESC);
CREATE INDEX idx_runs_v2_conv_uid ON runs_v2(conv_uid);
CREATE INDEX idx_block_overlays_v2_run_status ON block_overlays_v2(run_id, status);
CREATE INDEX idx_block_overlays_v2_pending ON block_overlays_v2(run_id, block_uid)
  WHERE status = 'pending';

-- Step 4: create_run_v2 RPC (with SET search_path = '')
CREATE OR REPLACE FUNCTION public.create_run_v2(
  p_owner_id UUID,
  p_conv_uid TEXT,
  p_schema_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_run_id UUID;
  v_total_blocks INTEGER;
BEGIN
  SELECT conv_total_blocks INTO v_total_blocks
  FROM public.documents_v2
  WHERE conv_uid = p_conv_uid
    AND owner_id = p_owner_id
    AND status = 'ingested';

  IF v_total_blocks IS NULL THEN
    RAISE EXCEPTION 'Document not found, not owned by user, or not ingested';
  END IF;

  INSERT INTO public.runs_v2 (owner_id, conv_uid, schema_id, total_blocks)
  VALUES (p_owner_id, p_conv_uid, p_schema_id, v_total_blocks)
  RETURNING run_id INTO v_run_id;

  INSERT INTO public.block_overlays_v2 (run_id, block_uid)
  SELECT v_run_id, b.block_uid
  FROM public.blocks_v2 b
  WHERE b.conv_uid = p_conv_uid
  ORDER BY b.block_index;

  RETURN v_run_id;
END;
$$;

-- Step 5: RLS policies
ALTER TABLE runs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_overlays_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY runs_v2_select_own ON runs_v2
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY block_overlays_v2_select_own ON block_overlays_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM runs_v2 r
      WHERE r.run_id = block_overlays_v2.run_id
        AND r.owner_id = auth.uid()
    )
  );

-- Step 6: pg_cron for documents_v2
SELECT cron.schedule(
  'stale_conversion_cleanup_v2',
  '*/1 * * * *',
  $$
  UPDATE public.documents_v2
  SET status = 'conversion_failed',
      error = COALESCE(error, 'conversion timed out (stale)')
  WHERE status = 'converting'
    AND uploaded_at < now() - INTERVAL '5 minutes';
  $$
);

-- Security fix: set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Data migration: annotation_runs -> runs_v2
INSERT INTO runs_v2 (
  run_id, owner_id, conv_uid, schema_id,
  status, total_blocks, completed_blocks, failed_blocks,
  started_at, completed_at, failure_log
)
SELECT
  ar.run_id, ar.owner_id, ar.doc_uid, ar.schema_id,
  ar.status, ar.total_blocks, ar.completed_blocks, ar.failed_blocks,
  ar.started_at, ar.completed_at, ar.failure_log
FROM annotation_runs ar
WHERE ar.doc_uid IN (SELECT conv_uid FROM documents_v2);

-- Data migration: block_annotations -> block_overlays_v2
-- (remap block_uid from hex hash to conv_uid:block_index format)
INSERT INTO block_overlays_v2 (
  run_id, block_uid, overlay_jsonb, status,
  claimed_by, claimed_at, attempt_count, last_error
)
SELECT
  ba.run_id,
  b.doc_uid || ':' || b.block_index::text,
  ba.annotation_jsonb,
  ba.status,
  ba.claimed_by,
  ba.claimed_at,
  ba.attempt_count,
  ba.last_error
FROM block_annotations ba
JOIN blocks b ON b.block_uid = ba.block_uid
WHERE ba.run_id IN (SELECT run_id FROM runs_v2);
