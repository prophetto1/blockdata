-- Migration 008: Projects hierarchy
-- Adds:
-- - public.projects (owned by auth user)
-- - documents_v2.project_id FK to projects
-- - backfill existing documents into a per-owner default project

CREATE TABLE IF NOT EXISTS public.projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  project_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_unique_owner_name UNIQUE (owner_id, project_name)
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_created_at
  ON public.projects(owner_id, created_at DESC);

-- updated_at trigger (helper exists already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_projects_updated_at'
  ) THEN
    CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS: owner can manage their own projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_own ON public.projects;
CREATE POLICY projects_select_own
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS projects_insert_own ON public.projects;
CREATE POLICY projects_insert_own
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS projects_update_own ON public.projects;
CREATE POLICY projects_update_own
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS projects_delete_own ON public.projects;
CREATE POLICY projects_delete_own
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- documents_v2.project_id
ALTER TABLE public.documents_v2
  ADD COLUMN IF NOT EXISTS project_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'documents_v2'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'documents_v2_project_id_fkey'
  ) THEN
    ALTER TABLE public.documents_v2
      ADD CONSTRAINT documents_v2_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(project_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_v2_project_uploaded
  ON public.documents_v2(project_id, uploaded_at DESC);

-- Backfill: for each owner with documents missing project_id, create one default project
-- and assign all missing documents to it.
WITH owners_needing_default AS (
  SELECT DISTINCT owner_id
  FROM public.documents_v2
  WHERE project_id IS NULL
),
inserted AS (
  INSERT INTO public.projects (owner_id, project_name, description)
  SELECT
    o.owner_id,
    'Default Project',
    'Auto-created for existing documents'
  FROM owners_needing_default o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.owner_id = o.owner_id
  )
  RETURNING project_id, owner_id
)
UPDATE public.documents_v2 d
SET project_id = i.project_id
FROM inserted i
WHERE d.owner_id = i.owner_id
  AND d.project_id IS NULL;

