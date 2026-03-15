-- Subordinate item tracking under service_runs.
-- One row per file/object being processed in a load run.
CREATE TABLE IF NOT EXISTS public.service_run_items (
  item_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.service_runs(run_id) ON DELETE CASCADE,
  item_key    text NOT NULL,
  item_type   text NOT NULL DEFAULT 'file',
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  rows_written  integer NOT NULL DEFAULT 0,
  rows_failed   integer NOT NULL DEFAULT 0,
  error_message text,
  storage_uri   text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_run_items_run ON service_run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_service_run_items_status ON service_run_items(run_id, status) WHERE status = 'pending';

ALTER TABLE public.service_run_items ENABLE ROW LEVEL SECURITY;

-- Users see items for runs they created. Creator-owned model — project_id
-- is metadata for grouping, not an authorization path in this first slice.
CREATE POLICY service_run_items_select ON service_run_items FOR SELECT TO authenticated
  USING (run_id IN (
    SELECT sr.run_id FROM service_runs sr
    WHERE sr.created_by = auth.uid()
  ));
CREATE POLICY service_run_items_service_role ON service_run_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.service_run_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_run_items TO authenticated;
GRANT ALL ON TABLE public.service_run_items TO service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE service_run_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Atomic claim RPC: prevents double-claiming under concurrency.
-- Same pattern as claim_extraction_items from migration 091.
CREATE OR REPLACE FUNCTION public.claim_run_item(
  p_run_id uuid,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.service_run_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT i.item_id
    FROM public.service_run_items i
    WHERE i.run_id = p_run_id
      AND i.status = 'pending'
    ORDER BY i.item_key, i.item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.service_run_items i
  SET status = 'running', started_at = now()
  FROM candidate
  WHERE i.item_id = candidate.item_id
  RETURNING i.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_run_item(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_run_item(uuid, integer) TO service_role;

-- Add destination identity and ownership columns to service_runs.
ALTER TABLE public.service_runs
  ADD COLUMN IF NOT EXISTS dest_function_id uuid REFERENCES public.service_functions(function_id),
  ADD COLUMN IF NOT EXISTS dest_service_id uuid REFERENCES public.service_registry(service_id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Expand status CHECK to include 'partial' for runs with mixed item outcomes.
ALTER TABLE public.service_runs DROP CONSTRAINT IF EXISTS service_runs_status_check;
ALTER TABLE public.service_runs ADD CONSTRAINT service_runs_status_check
  CHECK (status IN ('pending', 'running', 'complete', 'partial', 'failed', 'cancelled'));

-- Fix the existing service_runs RLS: migration 050 exposes project_id IS NULL rows
-- to ALL authenticated users. Replace with creator-owned policy.
-- project_id is metadata for grouping — not an authorization path in this first slice.
DROP POLICY IF EXISTS service_runs_select ON service_runs;
CREATE POLICY service_runs_select ON service_runs FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Add service_runs to realtime (was missing from migration 056).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE service_runs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
