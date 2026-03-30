-- Finalize source-set storage contract for pipeline jobs.

ALTER TABLE public.pipeline_jobs
  DROP CONSTRAINT IF EXISTS pipeline_jobs_source_set_id_fkey;

ALTER TABLE public.pipeline_jobs
  ADD CONSTRAINT pipeline_jobs_source_set_id_fkey
  FOREIGN KEY (source_set_id)
  REFERENCES public.pipeline_source_sets(source_set_id)
  ON DELETE CASCADE;

ALTER TABLE public.pipeline_jobs
  ALTER COLUMN source_set_id SET NOT NULL;

DROP INDEX IF EXISTS ux_pipeline_jobs_active_source_kind;

CREATE UNIQUE INDEX IF NOT EXISTS ux_pipeline_jobs_active_source_set_kind
  ON public.pipeline_jobs (owner_id, pipeline_kind, source_set_id)
  WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_source_set_created
  ON public.pipeline_jobs (source_set_id, created_at DESC);
