-- Migration 070: Create flow_executions table for execution history per flow.

CREATE TABLE IF NOT EXISTS public.flow_executions (
  execution_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  flow_id       TEXT NOT NULL,
  revision      INT,
  namespace     TEXT NOT NULL DEFAULT 'default',
  state         TEXT NOT NULL DEFAULT 'RUNNING'
    CHECK (state IN ('SUCCESS', 'FAILED', 'RUNNING', 'WARNING', 'KILLED', 'PAUSED')),
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  duration_ms   INT,
  labels        JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_type  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ExecutionsTab: WHERE flow_id = ? ORDER BY start_date DESC
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_start
  ON public.flow_executions (flow_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_flow_executions_project
  ON public.flow_executions (project_id);

-- RLS
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flow_executions_select_own ON public.flow_executions;
CREATE POLICY flow_executions_select_own
  ON public.flow_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_projects p
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
      FROM public.user_projects p
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
      FROM public.user_projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_projects p
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
      FROM public.user_projects p
      WHERE p.project_id = flow_executions.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_executions_service_role ON public.flow_executions;
CREATE POLICY flow_executions_service_role
  ON public.flow_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.flow_executions FROM anon, authenticated;
GRANT SELECT ON TABLE public.flow_executions TO authenticated;
GRANT ALL ON TABLE public.flow_executions TO service_role;
