-- Introduce a pipeline-owned source registry so Pipeline Services no longer
-- depend on source_documents as their primary source inventory.

CREATE TABLE public.pipeline_sources (
  pipeline_source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  pipeline_kind TEXT NOT NULL,
  storage_service_slug TEXT NOT NULL,
  storage_object_id UUID NOT NULL REFERENCES public.storage_objects(storage_object_id) ON DELETE CASCADE,
  source_uid TEXT NOT NULL,
  doc_title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  byte_size BIGINT,
  object_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pipeline_sources_pipeline_object_uidx
  ON public.pipeline_sources (pipeline_kind, storage_object_id);

CREATE UNIQUE INDEX pipeline_sources_owner_project_kind_source_uid_uidx
  ON public.pipeline_sources (owner_id, project_id, pipeline_kind, source_uid);

CREATE INDEX pipeline_sources_owner_project_kind_idx
  ON public.pipeline_sources (owner_id, project_id, pipeline_kind, created_at DESC);

CREATE INDEX pipeline_sources_object_idx
  ON public.pipeline_sources (storage_object_id);

CREATE TRIGGER trg_pipeline_sources_updated_at
  BEFORE UPDATE ON public.pipeline_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pipeline_source_set_items
  DROP CONSTRAINT IF EXISTS pipeline_source_set_items_source_uid_fkey;

ALTER TABLE public.pipeline_jobs
  DROP CONSTRAINT IF EXISTS pipeline_jobs_source_uid_fkey;

ALTER TABLE public.pipeline_source_set_items
  ADD COLUMN pipeline_source_id UUID;

ALTER TABLE public.pipeline_jobs
  ADD COLUMN pipeline_source_id UUID;

ALTER TABLE public.pipeline_source_set_items
  ADD CONSTRAINT pipeline_source_set_items_pipeline_source_id_fkey
  FOREIGN KEY (pipeline_source_id)
  REFERENCES public.pipeline_sources(pipeline_source_id)
  ON DELETE CASCADE;

ALTER TABLE public.pipeline_jobs
  ADD CONSTRAINT pipeline_jobs_pipeline_source_id_fkey
  FOREIGN KEY (pipeline_source_id)
  REFERENCES public.pipeline_sources(pipeline_source_id)
  ON DELETE CASCADE;

CREATE INDEX idx_pipeline_source_set_items_pipeline_source_id
  ON public.pipeline_source_set_items (pipeline_source_id);

CREATE INDEX idx_pipeline_jobs_pipeline_source_id
  ON public.pipeline_jobs (pipeline_source_id);
