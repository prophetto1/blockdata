-- Generic pipeline jobs/deliverables foundation for Pipeline Services.

-- Broaden storage-kind support so final pipeline artifacts count against the
-- shared user quota model without creating a second storage subsystem.
ALTER TABLE public.storage_upload_reservations
  DROP CONSTRAINT IF EXISTS storage_upload_reservations_storage_kind_check;

ALTER TABLE public.storage_upload_reservations
  ADD CONSTRAINT storage_upload_reservations_storage_kind_check
  CHECK (storage_kind IN ('source', 'converted', 'parsed', 'export', 'pipeline'));

ALTER TABLE public.storage_objects
  DROP CONSTRAINT IF EXISTS storage_objects_storage_kind_check;

ALTER TABLE public.storage_objects
  ADD CONSTRAINT storage_objects_storage_kind_check
  CHECK (storage_kind IN ('source', 'converted', 'parsed', 'export', 'pipeline'));

CREATE OR REPLACE FUNCTION public.reserve_user_storage(
  p_user_id UUID,
  p_project_id UUID,
  p_bucket TEXT,
  p_object_key TEXT,
  p_requested_bytes BIGINT,
  p_content_type TEXT,
  p_original_filename TEXT,
  p_storage_kind TEXT DEFAULT 'source',
  p_source_uid TEXT DEFAULT NULL
)
RETURNS public.storage_upload_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quota public.storage_quotas;
  v_reservation public.storage_upload_reservations;
BEGIN
  IF p_requested_bytes < 0 THEN
    RAISE EXCEPTION 'requested bytes must be non-negative';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public._storage_user_owns_project(p_user_id, p_project_id) THEN
    RAISE EXCEPTION 'project does not belong to user';
  END IF;

  IF p_storage_kind NOT IN ('source', 'converted', 'parsed', 'export', 'pipeline') THEN
    RAISE EXCEPTION 'invalid storage kind';
  END IF;

  SELECT *
  INTO v_quota
  FROM public.storage_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quota not provisioned for user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storage_upload_reservations r
    WHERE r.owner_user_id = p_user_id
      AND r.object_key = p_object_key
      AND r.bucket = p_bucket
      AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending reservation already exists for this object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storage_objects so
    WHERE so.owner_user_id = p_user_id
      AND so.bucket = p_bucket
      AND so.object_key = p_object_key
      AND so.status = 'active'
  ) THEN
    RAISE EXCEPTION 'object already exists';
  END IF;

  IF v_quota.used_bytes + v_quota.reserved_bytes + p_requested_bytes > v_quota.quota_bytes THEN
    RAISE EXCEPTION 'storage quota exceeded';
  END IF;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes + p_requested_bytes,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.storage_upload_reservations (
    owner_user_id,
    project_id,
    bucket,
    object_key,
    requested_bytes,
    content_type,
    original_filename,
    storage_kind,
    source_uid
  )
  VALUES (
    p_user_id,
    p_project_id,
    p_bucket,
    p_object_key,
    p_requested_bytes,
    p_content_type,
    p_original_filename,
    p_storage_kind,
    p_source_uid
  )
  RETURNING *
  INTO v_reservation;

  RETURN v_reservation;
END;
$$;

CREATE TABLE IF NOT EXISTS public.pipeline_jobs (
  job_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_kind       TEXT NOT NULL,
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id          UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
  source_uid          TEXT NOT NULL REFERENCES public.source_documents(source_uid) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  stage               TEXT NOT NULL DEFAULT 'queued',
  failure_stage       TEXT,
  error_message       TEXT,
  section_count       INTEGER,
  chunk_count         INTEGER,
  embedding_provider  TEXT,
  embedding_model     TEXT,
  claimed_at          TIMESTAMPTZ,
  heartbeat_at        TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_jobs_select_own ON public.pipeline_jobs
  FOR SELECT USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_owner_created
  ON public.pipeline_jobs (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_source_created
  ON public.pipeline_jobs (source_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_claim_queue
  ON public.pipeline_jobs (pipeline_kind, status, created_at, job_id)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_running_heartbeat
  ON public.pipeline_jobs (status, heartbeat_at)
  WHERE status = 'running';

CREATE UNIQUE INDEX IF NOT EXISTS ux_pipeline_jobs_active_source_kind
  ON public.pipeline_jobs (owner_id, pipeline_kind, source_uid)
  WHERE status IN ('queued', 'running');

CREATE TRIGGER trg_pipeline_jobs_updated_at
  BEFORE UPDATE ON public.pipeline_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.pipeline_deliverables (
  deliverable_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID NOT NULL REFERENCES public.pipeline_jobs(job_id) ON DELETE CASCADE,
  pipeline_kind       TEXT NOT NULL,
  deliverable_kind    TEXT NOT NULL,
  storage_object_id   UUID NOT NULL REFERENCES public.storage_objects(storage_object_id) ON DELETE RESTRICT,
  filename            TEXT NOT NULL,
  content_type        TEXT NOT NULL,
  byte_size           BIGINT NOT NULL CHECK (byte_size >= 0),
  checksum_sha256     TEXT,
  metadata_jsonb      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_deliverables_select_own ON public.pipeline_deliverables
  FOR SELECT USING (
    job_id IN (
      SELECT pj.job_id
      FROM public.pipeline_jobs pj
      WHERE pj.owner_id = auth.uid()
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_pipeline_deliverables_job_kind
  ON public.pipeline_deliverables (job_id, deliverable_kind);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pipeline_deliverables_storage_object
  ON public.pipeline_deliverables (storage_object_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_deliverables_job_created
  ON public.pipeline_deliverables (job_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_pipeline_jobs(
  p_pipeline_kind TEXT,
  p_limit INTEGER DEFAULT 1
)
RETURNS SETOF public.pipeline_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT pj.job_id
    FROM public.pipeline_jobs pj
    WHERE pj.pipeline_kind = p_pipeline_kind
      AND pj.status = 'queued'
    ORDER BY pj.created_at ASC, pj.job_id ASC
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF pj SKIP LOCKED
  )
  UPDATE public.pipeline_jobs pj
  SET status = 'running',
      claimed_at = now(),
      heartbeat_at = now(),
      started_at = COALESCE(pj.started_at, now()),
      updated_at = now()
  FROM candidate
  WHERE pj.job_id = candidate.job_id
  RETURNING pj.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pipeline_jobs(TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pipeline_jobs(TEXT, INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.reap_stale_pipeline_jobs(
  p_stale_after_minutes INTEGER DEFAULT 15,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF public.pipeline_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT pj.job_id
    FROM public.pipeline_jobs pj
    WHERE pj.status = 'running'
      AND pj.heartbeat_at IS NOT NULL
      AND pj.heartbeat_at < now() - make_interval(mins => GREATEST(1, p_stale_after_minutes))
    ORDER BY pj.heartbeat_at ASC, pj.job_id ASC
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF pj SKIP LOCKED
  )
  UPDATE public.pipeline_jobs pj
  SET status = 'failed',
      failure_stage = COALESCE(NULLIF(pj.failure_stage, ''), NULLIF(pj.stage, ''), 'queued'),
      error_message = 'Job failed after stale heartbeat timeout',
      completed_at = now(),
      heartbeat_at = now(),
      updated_at = now()
  FROM candidate
  WHERE pj.job_id = candidate.job_id
  RETURNING pj.*;
END;
$$;

REVOKE ALL ON FUNCTION public.reap_stale_pipeline_jobs(INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stale_pipeline_jobs(INTEGER, INTEGER)
  TO service_role;
