-- Migration 035: Track B extract pipeline status/step constraints + extract output table

-- ---------------------------------------------------------------------------
-- 1) Extend doc status vocabulary with extracting
-- ---------------------------------------------------------------------------
ALTER TABLE public.unstructured_run_docs_v2
  DROP CONSTRAINT IF EXISTS unstructured_run_docs_v2_status_check;

ALTER TABLE public.unstructured_run_docs_v2
  ADD CONSTRAINT unstructured_run_docs_v2_status_check
  CHECK (status IN (
    'queued', 'indexing', 'downloading', 'partitioning',
    'enriching', 'chunking', 'extracting', 'persisting',
    'success', 'failed', 'cancelled'
  ));

-- ---------------------------------------------------------------------------
-- 2) Extend step artifact vocabulary with extract
-- ---------------------------------------------------------------------------
ALTER TABLE public.unstructured_step_artifacts_v2
  DROP CONSTRAINT IF EXISTS unstructured_step_artifacts_v2_step_name_check;

ALTER TABLE public.unstructured_step_artifacts_v2
  ADD CONSTRAINT unstructured_step_artifacts_v2_step_name_check
  CHECK (step_name IN (
    'index', 'download', 'partition', 'chunk', 'embed', 'enrich', 'extract',
    'preview', 'stage', 'upload', 'persist'
  ));

-- ---------------------------------------------------------------------------
-- 3) Update doc transition guard for extract flow branch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_unstructured_doc_status_transition_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  from_status TEXT;
  to_status TEXT;
BEGIN
  from_status := OLD.status;
  to_status := NEW.status;

  IF to_status = from_status THEN
    RETURN NEW;
  END IF;

  IF from_status = 'queued' AND to_status IN ('indexing', 'downloading', 'partitioning', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'indexing' AND to_status IN ('downloading', 'partitioning', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'downloading' AND to_status IN ('partitioning', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'partitioning' AND to_status IN ('enriching', 'chunking', 'extracting', 'persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'enriching' AND to_status IN ('chunking', 'extracting', 'persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'chunking' AND to_status IN ('persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'extracting' AND to_status IN ('persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'persisting' AND to_status IN ('success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status IN ('success', 'failed', 'cancelled') THEN
    RAISE EXCEPTION
      'Illegal doc status transition: % -> % (terminal state)',
      from_status,
      to_status;
  END IF;

  RAISE EXCEPTION 'Illegal doc status transition: % -> %', from_status, to_status;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Per-block extract output persistence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unstructured_block_extracts_v2 (
  run_uid UUID NOT NULL REFERENCES public.unstructured_workflow_runs_v2(run_uid) ON DELETE CASCADE,
  u_block_uid TEXT NOT NULL REFERENCES public.unstructured_blocks_v2(u_block_uid) ON DELETE CASCADE,
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE RESTRICT,
  user_schema_uid TEXT NOT NULL CHECK (user_schema_uid ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  extract_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  llm_usage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_uid, u_block_uid)
);

CREATE INDEX IF NOT EXISTS idx_unstructured_block_extracts_v2_source
  ON public.unstructured_block_extracts_v2(source_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unstructured_block_extracts_v2_schema
  ON public.unstructured_block_extracts_v2(user_schema_uid, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_unstructured_block_extracts_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_unstructured_block_extracts_v2_updated_at
      BEFORE UPDATE ON public.unstructured_block_extracts_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.unstructured_block_extracts_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unstructured_block_extracts_v2_select_member ON public.unstructured_block_extracts_v2;
CREATE POLICY unstructured_block_extracts_v2_select_member
  ON public.unstructured_block_extracts_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unstructured_workflow_runs_v2 r
      JOIN public.workspace_b_memberships_v2 m
        ON m.workspace_id = r.workspace_id
      WHERE r.run_uid = unstructured_block_extracts_v2.run_uid
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );
