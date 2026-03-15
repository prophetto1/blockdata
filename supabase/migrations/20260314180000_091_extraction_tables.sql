-- Extraction schemas: user-defined JSON Schemas for structured extraction
CREATE TABLE IF NOT EXISTS public.extraction_schemas (
  schema_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id),
  project_id       uuid REFERENCES public.projects(project_id),
  schema_name      text NOT NULL,
  schema_body      jsonb NOT NULL,
  schema_body_hash text,
  extraction_target text NOT NULL DEFAULT 'document'
    CHECK (extraction_target IN ('page', 'document')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_schemas_select_own ON extraction_schemas
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY extraction_schemas_insert_own ON extraction_schemas
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (project_id IS NULL OR project_id IN (
      SELECT project_id FROM projects WHERE owner_id = auth.uid()
    ))
  );
CREATE POLICY extraction_schemas_update_own ON extraction_schemas
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY extraction_schemas_delete_own ON extraction_schemas
  FOR DELETE USING (owner_id = auth.uid());

CREATE INDEX idx_extraction_schemas_project ON extraction_schemas(project_id);
CREATE INDEX idx_extraction_schemas_body_hash ON extraction_schemas(schema_body_hash);

-- Reuse the existing set_updated_at() trigger function from migration _004_.
-- Do NOT create a new function — the shared one already exists.
CREATE TRIGGER trg_extraction_schemas_updated_at
  BEFORE UPDATE ON public.extraction_schemas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extraction jobs: one row per extraction run
CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  job_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id),
  source_uid       text NOT NULL REFERENCES public.source_documents(source_uid),
  schema_id        uuid NOT NULL REFERENCES public.extraction_schemas(schema_id),
  status           text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'complete', 'failed', 'cancelled')),
  llm_provider     text NOT NULL DEFAULT 'vertex_ai',
  llm_model        text NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  config_jsonb     jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items      integer NOT NULL DEFAULT 0,
  completed_items  integer NOT NULL DEFAULT 0,
  failed_items     integer NOT NULL DEFAULT 0,
  token_usage      jsonb,
  error            text,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_jobs_select_own ON extraction_jobs
  FOR SELECT USING (owner_id = auth.uid());
-- No INSERT policy: jobs are created exclusively by the run-extract edge
-- function using the admin client (service role), which bypasses RLS.
-- Omitting the INSERT policy with RLS enabled means user-scoped clients
-- cannot insert rows, which is the correct security boundary.

CREATE INDEX idx_extraction_jobs_source ON extraction_jobs(source_uid);
CREATE INDEX idx_extraction_jobs_schema ON extraction_jobs(schema_id);

-- Extraction job items: durable work items, one per document or page.
-- No RLS — items are only accessed through admin-client edge functions.
-- The claim RPC is service-role-only (REVOKE/GRANT below) and does NOT
-- verify ownership itself; the calling edge function must do that.
CREATE TABLE IF NOT EXISTS public.extraction_job_items (
  item_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.extraction_jobs(job_id) ON DELETE CASCADE,
  target_kind   text NOT NULL CHECK (target_kind IN ('document', 'page')),
  page_number   integer,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'complete', 'failed')),
  claimed_by    text,
  claimed_at    timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error    text
);

CREATE INDEX idx_extraction_job_items_job ON extraction_job_items(job_id);
CREATE INDEX idx_extraction_job_items_pending
  ON extraction_job_items(job_id, status) WHERE status = 'pending';

-- Extraction results: structured data extracted from documents
CREATE TABLE IF NOT EXISTS public.extraction_results (
  result_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        uuid NOT NULL UNIQUE REFERENCES public.extraction_job_items(item_id) ON DELETE CASCADE,
  job_id         uuid NOT NULL REFERENCES public.extraction_jobs(job_id) ON DELETE CASCADE,
  page_number    integer,
  extracted_data jsonb NOT NULL,
  raw_response   jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_results_select_own ON extraction_results
  FOR SELECT USING (
    job_id IN (SELECT job_id FROM extraction_jobs WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_extraction_results_job ON extraction_results(job_id);

-- Claim RPC: atomic work item acquisition using FOR UPDATE SKIP LOCKED.
--
-- Auth model: this RPC is SERVICE-ROLE-ONLY. It does not verify ownership
-- because edge functions run with the admin client (where auth.uid() is not
-- set). The calling edge function MUST verify that the authenticated user
-- owns the job BEFORE calling this RPC. Direct execution by anon or
-- authenticated clients is explicitly revoked below.
CREATE OR REPLACE FUNCTION public.claim_extraction_items(
  p_job_id uuid,
  p_worker_id text,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.extraction_job_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT i.item_id
    FROM public.extraction_job_items i
    WHERE i.job_id = p_job_id
      AND i.status = 'pending'
    ORDER BY i.page_number NULLS FIRST, i.item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.extraction_job_items i
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = now(),
    attempt_count = i.attempt_count + 1
  FROM candidate
  WHERE i.item_id = candidate.item_id
  RETURNING i.*;
END;
$$;

-- Lock down claim RPC: only service_role (admin client in edge functions)
-- can execute. Matches the hardening pattern used elsewhere in this repo
-- (e.g. 20260215005000_033_fix_workspace_membership_rls_recursion.sql).
REVOKE ALL ON FUNCTION public.claim_extraction_items(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_extraction_items(uuid, text, integer)
  TO service_role;

-- Guarded Realtime publication.
-- extraction_job_items is intentionally EXCLUDED: it has no RLS (items are
-- only accessed via admin-client edge functions and the claim RPC), and
-- publishing a no-RLS table to Realtime would expose all rows to any
-- authenticated subscriber. The frontend watches extraction_jobs (status,
-- counters) and extraction_results (incremental data) instead.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_schemas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
