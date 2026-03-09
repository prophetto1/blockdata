-- Migration 073: Normalize project/flow identity across the Supabase flow tables.
--
-- Relationship contract:
-- - a user owns projects via public.projects.owner_id
-- - a project can contain many flows
-- - a flow is identified within a project by (namespace, flow_id)
-- - revisions, executions, and logs belong to a flow, not directly to a user

COMMENT ON TABLE public.projects IS
  'User-owned project container. Flow records inherit access through the owning project.';

ALTER TABLE public.flow_sources
  ADD COLUMN IF NOT EXISTS namespace TEXT DEFAULT 'default';

UPDATE public.flow_sources
SET namespace = 'default'
WHERE namespace IS NULL OR btrim(namespace) = '';

ALTER TABLE public.flow_sources
  ALTER COLUMN namespace SET NOT NULL;

COMMENT ON TABLE public.flow_sources IS
  'Revision history for project-scoped flows. A flow is identified by (project_id, namespace, flow_id).';
COMMENT ON COLUMN public.flow_sources.project_id IS
  'Owning project for this flow revision.';
COMMENT ON COLUMN public.flow_sources.namespace IS
  'Kestra namespace for the flow within the owning project.';
COMMENT ON COLUMN public.flow_sources.flow_id IS
  'Flow identifier within the owning project and namespace.';

ALTER TABLE public.flow_sources
  DROP CONSTRAINT IF EXISTS flow_sources_project_flow_revision_uq;

ALTER TABLE public.flow_sources
  ADD CONSTRAINT flow_sources_project_namespace_flow_revision_uq
  UNIQUE (project_id, namespace, flow_id, revision);

DROP INDEX IF EXISTS idx_flow_sources_project_flow_rev;
CREATE INDEX IF NOT EXISTS idx_flow_sources_project_namespace_flow_rev
  ON public.flow_sources (project_id, namespace, flow_id, revision DESC);

ALTER TABLE public.flow_executions
  DROP CONSTRAINT IF EXISTS flow_executions_project_id_fkey;

ALTER TABLE public.flow_executions
  ADD CONSTRAINT flow_executions_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(project_id)
  ON DELETE CASCADE;

COMMENT ON TABLE public.flow_executions IS
  'Execution history for project-scoped flows. Identity is (project_id, namespace, flow_id).';
COMMENT ON COLUMN public.flow_executions.project_id IS
  'Owning project for this execution.';
COMMENT ON COLUMN public.flow_executions.namespace IS
  'Kestra namespace for the executed flow.';
COMMENT ON COLUMN public.flow_executions.flow_id IS
  'Flow identifier within the owning project and namespace.';

DROP INDEX IF EXISTS idx_flow_executions_flow_start;
CREATE INDEX IF NOT EXISTS idx_flow_executions_project_namespace_flow_start
  ON public.flow_executions (project_id, namespace, flow_id, start_date DESC);

DROP POLICY IF EXISTS flow_executions_select_own ON public.flow_executions;
CREATE POLICY flow_executions_select_own
  ON public.flow_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_executions_insert_own ON public.flow_executions;
CREATE POLICY flow_executions_insert_own
  ON public.flow_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_executions_update_own ON public.flow_executions;
CREATE POLICY flow_executions_update_own
  ON public.flow_executions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_executions_delete_own ON public.flow_executions;
CREATE POLICY flow_executions_delete_own
  ON public.flow_executions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  );

ALTER TABLE public.flow_logs
  ADD COLUMN IF NOT EXISTS namespace TEXT;

UPDATE public.flow_logs fl
SET namespace = fe.namespace
FROM public.flow_executions fe
WHERE fl.execution_id = fe.execution_id
  AND (fl.namespace IS NULL OR btrim(fl.namespace) = '');

UPDATE public.flow_logs
SET namespace = 'default'
WHERE namespace IS NULL OR btrim(namespace) = '';

ALTER TABLE public.flow_logs
  ALTER COLUMN namespace SET NOT NULL;

ALTER TABLE public.flow_logs
  DROP CONSTRAINT IF EXISTS flow_logs_project_id_fkey;

ALTER TABLE public.flow_logs
  ADD CONSTRAINT flow_logs_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(project_id)
  ON DELETE CASCADE;

COMMENT ON TABLE public.flow_logs IS
  'Log entries for project-scoped flows. Identity is (project_id, namespace, flow_id).';
COMMENT ON COLUMN public.flow_logs.project_id IS
  'Owning project for this log entry.';
COMMENT ON COLUMN public.flow_logs.namespace IS
  'Kestra namespace for the logged flow.';
COMMENT ON COLUMN public.flow_logs.flow_id IS
  'Flow identifier within the owning project and namespace.';

DROP INDEX IF EXISTS idx_flow_logs_flow_ts;
CREATE INDEX IF NOT EXISTS idx_flow_logs_project_namespace_flow_ts
  ON public.flow_logs (project_id, namespace, flow_id, timestamp DESC);

DROP POLICY IF EXISTS flow_logs_select_own ON public.flow_logs;
CREATE POLICY flow_logs_select_own
  ON public.flow_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_logs_insert_own ON public.flow_logs;
CREATE POLICY flow_logs_insert_own
  ON public.flow_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_logs_update_own ON public.flow_logs;
CREATE POLICY flow_logs_update_own
  ON public.flow_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_logs_delete_own ON public.flow_logs;
CREATE POLICY flow_logs_delete_own
  ON public.flow_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  );
