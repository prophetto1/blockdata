-- Migration 026: Track B (Unstructured OSS) control-plane and data-plane foundation
-- Locked requirements source:
-- - docs/analysis/unstructured-track-requirements-lock.md
-- - docs/analysis/unstructured-full-pipeline-analysis-implementation-plan.md

-- ---------------------------------------------------------------------------
-- 1) Workspace B foundation (isolated from existing project ownership model)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_b_v2 (
  workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  workspace_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_b_v2_owner_name_unique UNIQUE (owner_id, workspace_name)
);

CREATE TABLE IF NOT EXISTS public.workspace_b_memberships_v2 (
  workspace_id UUID NOT NULL REFERENCES public.workspace_b_v2(workspace_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_b_memberships_v2_user_status
  ON public.workspace_b_memberships_v2(user_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_workspace_b_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_workspace_b_v2_updated_at
      BEFORE UPDATE ON public.workspace_b_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_workspace_b_memberships_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_workspace_b_memberships_v2_updated_at
      BEFORE UPDATE ON public.workspace_b_memberships_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Create one default workspace per existing project owner (idempotent).
INSERT INTO public.workspace_b_v2 (owner_id, workspace_name)
SELECT DISTINCT p.owner_id, 'Default Workspace'
FROM public.projects p
WHERE p.owner_id IS NOT NULL
ON CONFLICT (owner_id, workspace_name) DO NOTHING;

-- Ensure each workspace owner has active owner membership.
INSERT INTO public.workspace_b_memberships_v2 (workspace_id, user_id, role, status)
SELECT w.workspace_id, w.owner_id, 'owner', 'active'
FROM public.workspace_b_v2 w
ON CONFLICT (workspace_id, user_id) DO NOTHING;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'projects'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'projects_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES public.workspace_b_v2(workspace_id)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.projects p
SET workspace_id = w.workspace_id
FROM public.workspace_b_v2 w
WHERE w.owner_id = p.owner_id
  AND w.workspace_name = 'Default Workspace'
  AND p.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id_created_at
  ON public.projects(workspace_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2) Track B taxonomy mapping (versioned, test-covered contract target)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unstructured_taxonomy_mapping_v2 (
  mapping_version TEXT NOT NULL,
  raw_element_type TEXT NOT NULL,
  platform_block_type TEXT NOT NULL CHECK (platform_block_type IN (
    'heading', 'paragraph', 'list_item', 'code_block', 'table',
    'figure', 'caption', 'footnote', 'divider', 'html_block',
    'definition', 'checkbox', 'form_region', 'key_value_region',
    'page_header', 'page_footer', 'other'
  )),
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mapping_version, raw_element_type)
);

INSERT INTO public.unstructured_taxonomy_mapping_v2
  (mapping_version, raw_element_type, platform_block_type, is_fallback)
VALUES
  ('2026-02-14', 'Title', 'heading', false),
  ('2026-02-14', 'NarrativeText', 'paragraph', false),
  ('2026-02-14', 'Text', 'paragraph', false),
  ('2026-02-14', 'ListItem', 'list_item', false),
  ('2026-02-14', 'Table', 'table', false),
  ('2026-02-14', 'FigureCaption', 'caption', false),
  ('2026-02-14', 'Image', 'figure', false),
  ('2026-02-14', 'Header', 'page_header', false),
  ('2026-02-14', 'Footer', 'page_footer', false),
  ('2026-02-14', '__fallback__', 'other', true)
ON CONFLICT (mapping_version, raw_element_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Track B control-plane tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unstructured_workflows_v2 (
  workflow_uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_b_v2(workspace_id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(project_id) ON DELETE SET NULL,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  workflow_spec_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unstructured_workflows_v2_workspace_updated
  ON public.unstructured_workflows_v2(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.unstructured_workflow_runs_v2 (
  run_uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_b_v2(workspace_id) ON DELETE CASCADE,
  workflow_uid UUID REFERENCES public.unstructured_workflows_v2(workflow_uid) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  flow_mode TEXT NOT NULL CHECK (flow_mode IN ('transform', 'extract')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'partial_success', 'success', 'failed', 'cancelled'
  )),
  idempotency_scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  error TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unstructured_workflow_runs_v2_idempotency_unique
    UNIQUE (workspace_id, idempotency_scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_unstructured_workflow_runs_v2_workspace_created
  ON public.unstructured_workflow_runs_v2(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unstructured_workflow_runs_v2_project_status
  ON public.unstructured_workflow_runs_v2(project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.unstructured_run_docs_v2 (
  run_uid UUID NOT NULL REFERENCES public.unstructured_workflow_runs_v2(run_uid) ON DELETE CASCADE,
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'indexing', 'downloading', 'partitioning', 'chunking',
    'enriching', 'persisting', 'success', 'failed', 'cancelled'
  )),
  step_indexed_at TIMESTAMPTZ,
  step_downloaded_at TIMESTAMPTZ,
  step_partitioned_at TIMESTAMPTZ,
  step_chunked_at TIMESTAMPTZ,
  step_embedded_at TIMESTAMPTZ,
  step_uploaded_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_uid, source_uid)
);

CREATE INDEX IF NOT EXISTS idx_unstructured_run_docs_v2_source_status
  ON public.unstructured_run_docs_v2(source_uid, status);

CREATE TABLE IF NOT EXISTS public.unstructured_step_artifacts_v2 (
  artifact_uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_uid UUID NOT NULL REFERENCES public.unstructured_workflow_runs_v2(run_uid) ON DELETE CASCADE,
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE RESTRICT,
  step_name TEXT NOT NULL CHECK (step_name IN (
    'index', 'download', 'partition', 'chunk', 'embed', 'enrich', 'preview', 'stage', 'upload', 'persist'
  )),
  artifact_type TEXT NOT NULL DEFAULT 'generic',
  storage_bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unstructured_step_artifacts_v2_run_source
  ON public.unstructured_step_artifacts_v2(run_uid, source_uid, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4) Track B output tables (hard-isolated from Track A output tables)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unstructured_documents_v2 (
  u_doc_uid TEXT PRIMARY KEY,
  canonical_doc_uid TEXT NOT NULL CHECK (canonical_doc_uid ~ '^[0-9a-f]{64}$'),
  run_uid UUID NOT NULL REFERENCES public.unstructured_workflow_runs_v2(run_uid) ON DELETE CASCADE,
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.workspace_b_v2(workspace_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'success', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unstructured_documents_v2_run_source_unique UNIQUE (run_uid, source_uid)
);

CREATE INDEX IF NOT EXISTS idx_unstructured_documents_v2_canonical_doc_uid
  ON public.unstructured_documents_v2(canonical_doc_uid);

CREATE TABLE IF NOT EXISTS public.unstructured_blocks_v2 (
  u_block_uid TEXT PRIMARY KEY,
  u_doc_uid TEXT NOT NULL REFERENCES public.unstructured_documents_v2(u_doc_uid) ON DELETE CASCADE,
  canonical_block_uid TEXT NOT NULL CHECK (canonical_block_uid ~ '^[0-9a-f]{64}:\d+$'),
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE RESTRICT,
  raw_element_id TEXT,
  element_ordinal INTEGER NOT NULL CHECK (element_ordinal >= 0),
  page_number INTEGER CHECK (page_number IS NULL OR page_number >= 1),
  platform_block_type TEXT NOT NULL CHECK (platform_block_type IN (
    'heading', 'paragraph', 'list_item', 'code_block', 'table',
    'figure', 'caption', 'footnote', 'divider', 'html_block',
    'definition', 'checkbox', 'form_region', 'key_value_region',
    'page_header', 'page_footer', 'other'
  )),
  raw_element_type TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  coordinates_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unstructured_blocks_v2_u_doc_ordinal_unique UNIQUE (u_doc_uid, element_ordinal)
);

CREATE INDEX IF NOT EXISTS idx_unstructured_blocks_v2_doc_uid_ordinal
  ON public.unstructured_blocks_v2(u_doc_uid, element_ordinal);
CREATE INDEX IF NOT EXISTS idx_unstructured_blocks_v2_canonical_block_uid
  ON public.unstructured_blocks_v2(canonical_block_uid);
CREATE INDEX IF NOT EXISTS idx_unstructured_blocks_v2_raw_element_type
  ON public.unstructured_blocks_v2(raw_element_type);

CREATE TABLE IF NOT EXISTS public.unstructured_representations_v2 (
  u_repr_uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_uid UUID NOT NULL REFERENCES public.unstructured_workflow_runs_v2(run_uid) ON DELETE CASCADE,
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE RESTRICT,
  representation_type TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unstructured_representations_v2_run_source
  ON public.unstructured_representations_v2(run_uid, source_uid, created_at DESC);

-- Optional: reconstructable transition/event history for run/doc state changes.
CREATE TABLE IF NOT EXISTS public.unstructured_state_events_v2 (
  event_uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_uid UUID NOT NULL REFERENCES public.unstructured_workflow_runs_v2(run_uid) ON DELETE CASCADE,
  source_uid TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('run', 'doc')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unstructured_state_events_v2_run_created
  ON public.unstructured_state_events_v2(run_uid, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_unstructured_workflows_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_unstructured_workflows_v2_updated_at
      BEFORE UPDATE ON public.unstructured_workflows_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_unstructured_workflow_runs_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_unstructured_workflow_runs_v2_updated_at
      BEFORE UPDATE ON public.unstructured_workflow_runs_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_unstructured_run_docs_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_unstructured_run_docs_v2_updated_at
      BEFORE UPDATE ON public.unstructured_run_docs_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_unstructured_documents_v2_updated_at'
  ) THEN
    CREATE TRIGGER set_unstructured_documents_v2_updated_at
      BEFORE UPDATE ON public.unstructured_documents_v2
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) RLS: workspace-member visibility, service-role write path
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspace_b_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_b_memberships_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_workflows_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_workflow_runs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_run_docs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_step_artifacts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_documents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_blocks_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_representations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_state_events_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_taxonomy_mapping_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_b_v2_select_member ON public.workspace_b_v2;
CREATE POLICY workspace_b_v2_select_member
  ON public.workspace_b_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 m
      WHERE m.workspace_id = workspace_b_v2.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS workspace_b_memberships_v2_select_member ON public.workspace_b_memberships_v2;
CREATE POLICY workspace_b_memberships_v2_select_member
  ON public.workspace_b_memberships_v2
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 self
      WHERE self.workspace_id = workspace_b_memberships_v2.workspace_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_taxonomy_mapping_v2_select_all_auth ON public.unstructured_taxonomy_mapping_v2;
CREATE POLICY unstructured_taxonomy_mapping_v2_select_all_auth
  ON public.unstructured_taxonomy_mapping_v2
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS unstructured_workflows_v2_select_member ON public.unstructured_workflows_v2;
CREATE POLICY unstructured_workflows_v2_select_member
  ON public.unstructured_workflows_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 m
      WHERE m.workspace_id = unstructured_workflows_v2.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_workflow_runs_v2_select_member ON public.unstructured_workflow_runs_v2;
CREATE POLICY unstructured_workflow_runs_v2_select_member
  ON public.unstructured_workflow_runs_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 m
      WHERE m.workspace_id = unstructured_workflow_runs_v2.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_run_docs_v2_select_member ON public.unstructured_run_docs_v2;
CREATE POLICY unstructured_run_docs_v2_select_member
  ON public.unstructured_run_docs_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unstructured_workflow_runs_v2 r
      JOIN public.workspace_b_memberships_v2 m
        ON m.workspace_id = r.workspace_id
      WHERE r.run_uid = unstructured_run_docs_v2.run_uid
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_step_artifacts_v2_select_member ON public.unstructured_step_artifacts_v2;
CREATE POLICY unstructured_step_artifacts_v2_select_member
  ON public.unstructured_step_artifacts_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unstructured_workflow_runs_v2 r
      JOIN public.workspace_b_memberships_v2 m
        ON m.workspace_id = r.workspace_id
      WHERE r.run_uid = unstructured_step_artifacts_v2.run_uid
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_documents_v2_select_member ON public.unstructured_documents_v2;
CREATE POLICY unstructured_documents_v2_select_member
  ON public.unstructured_documents_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 m
      WHERE m.workspace_id = unstructured_documents_v2.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_blocks_v2_select_member ON public.unstructured_blocks_v2;
CREATE POLICY unstructured_blocks_v2_select_member
  ON public.unstructured_blocks_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unstructured_documents_v2 d
      JOIN public.workspace_b_memberships_v2 m
        ON m.workspace_id = d.workspace_id
      WHERE d.u_doc_uid = unstructured_blocks_v2.u_doc_uid
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_representations_v2_select_member ON public.unstructured_representations_v2;
CREATE POLICY unstructured_representations_v2_select_member
  ON public.unstructured_representations_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unstructured_workflow_runs_v2 r
      JOIN public.workspace_b_memberships_v2 m
        ON m.workspace_id = r.workspace_id
      WHERE r.run_uid = unstructured_representations_v2.run_uid
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS unstructured_state_events_v2_select_member ON public.unstructured_state_events_v2;
CREATE POLICY unstructured_state_events_v2_select_member
  ON public.unstructured_state_events_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unstructured_workflow_runs_v2 r
      JOIN public.workspace_b_memberships_v2 m
        ON m.workspace_id = r.workspace_id
      WHERE r.run_uid = unstructured_state_events_v2.run_uid
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );
