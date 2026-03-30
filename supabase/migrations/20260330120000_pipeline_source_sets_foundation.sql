-- Pipeline source-set foundation for multi-markdown pipeline runs.

CREATE TABLE IF NOT EXISTS public.pipeline_source_sets (
  source_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_kind TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  total_bytes BIGINT NOT NULL DEFAULT 0 CHECK (total_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_source_sets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pipeline_source_sets' AND policyname = 'pipeline_source_sets_select_own'
  ) THEN
    CREATE POLICY pipeline_source_sets_select_own ON public.pipeline_source_sets
      FOR SELECT USING (owner_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pipeline_source_set_items (
  source_set_id UUID NOT NULL REFERENCES public.pipeline_source_sets(source_set_id) ON DELETE CASCADE,
  source_order INTEGER NOT NULL CHECK (source_order >= 1),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_uid TEXT NOT NULL REFERENCES public.source_documents(source_uid) ON DELETE CASCADE,
  doc_title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  byte_size BIGINT,
  object_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_set_id, source_order),
  UNIQUE (source_set_id, source_uid)
);

ALTER TABLE public.pipeline_source_set_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pipeline_source_set_items' AND policyname = 'pipeline_source_set_items_select_own'
  ) THEN
    CREATE POLICY pipeline_source_set_items_select_own ON public.pipeline_source_set_items
      FOR SELECT USING (owner_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_source_sets_owner_project_updated
  ON public.pipeline_source_sets (owner_id, project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_source_set_items_source_uid
  ON public.pipeline_source_set_items (source_uid);

ALTER TABLE public.pipeline_jobs
  ADD COLUMN IF NOT EXISTS source_set_id UUID;

WITH distinct_jobs AS (
  SELECT DISTINCT
    pj.owner_id,
    pj.pipeline_kind,
    pj.project_id,
    pj.source_uid,
    COALESCE(sd.doc_title, 'Backfilled source set') AS label,
    COALESCE(sd.source_filesize, 0)::bigint AS total_bytes
  FROM public.pipeline_jobs pj
  LEFT JOIN public.source_documents sd ON sd.source_uid = pj.source_uid
  WHERE pj.source_set_id IS NULL
),
inserted_sets AS (
  INSERT INTO public.pipeline_source_sets (
    source_set_id,
    pipeline_kind,
    owner_id,
    project_id,
    label,
    member_count,
    total_bytes
  )
  SELECT gen_random_uuid(), pipeline_kind, owner_id, project_id, label, 1, total_bytes
  FROM distinct_jobs
  RETURNING source_set_id, pipeline_kind, owner_id, project_id, label, total_bytes
),
set_map AS (
  SELECT
    dj.owner_id,
    dj.pipeline_kind,
    dj.project_id,
    dj.source_uid,
    iset.source_set_id,
    dj.label,
    dj.total_bytes
  FROM distinct_jobs dj
  JOIN inserted_sets iset
    ON iset.owner_id = dj.owner_id
   AND iset.pipeline_kind = dj.pipeline_kind
   AND iset.project_id IS NOT DISTINCT FROM dj.project_id
   AND iset.label = dj.label
   AND iset.total_bytes = dj.total_bytes
)
INSERT INTO public.pipeline_source_set_items (
  source_set_id,
  source_order,
  owner_id,
  source_uid,
  doc_title,
  source_type,
  byte_size,
  object_key
)
SELECT
  sm.source_set_id,
  1,
  sm.owner_id,
  sm.source_uid,
  COALESCE(sd.doc_title, sm.label),
  COALESCE(sd.source_type, 'md'),
  COALESCE(sd.source_filesize, sm.total_bytes),
  sd.source_locator
FROM set_map sm
LEFT JOIN public.source_documents sd ON sd.source_uid = sm.source_uid
ON CONFLICT (source_set_id, source_uid) DO NOTHING;

UPDATE public.pipeline_jobs pj
SET source_set_id = psi.source_set_id
FROM public.pipeline_source_set_items psi
WHERE pj.source_set_id IS NULL
  AND pj.owner_id = psi.owner_id
  AND pj.source_uid = psi.source_uid;

CREATE TRIGGER trg_pipeline_source_sets_updated_at
  BEFORE UPDATE ON public.pipeline_source_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
