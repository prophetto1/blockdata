-- Migration 071: Create flow_logs table for per-execution log entries.

CREATE TABLE IF NOT EXISTS public.flow_logs (
  log_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID REFERENCES public.flow_executions(execution_id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  flow_id       TEXT NOT NULL,
  level         TEXT NOT NULL DEFAULT 'INFO'
    CHECK (level IN ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR')),
  task_id       TEXT,
  message       TEXT NOT NULL DEFAULT '',
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for LogsTab: WHERE flow_id = ? ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_flow_logs_flow_ts
  ON public.flow_logs (flow_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_flow_logs_execution
  ON public.flow_logs (execution_id);

CREATE INDEX IF NOT EXISTS idx_flow_logs_project
  ON public.flow_logs (project_id);

-- RLS
ALTER TABLE public.flow_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flow_logs_select_own ON public.flow_logs;
CREATE POLICY flow_logs_select_own
  ON public.flow_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_projects p
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
      FROM public.user_projects p
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
      FROM public.user_projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_projects p
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
      FROM public.user_projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_logs_service_role ON public.flow_logs;
CREATE POLICY flow_logs_service_role
  ON public.flow_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.flow_logs FROM anon, authenticated;
GRANT SELECT ON TABLE public.flow_logs TO authenticated;
GRANT ALL ON TABLE public.flow_logs TO service_role;
