-- Reconcile flow and extraction ownership back to public.user_projects
-- after the historical replay of 073 and 091.

ALTER TABLE public.flow_executions
  DROP CONSTRAINT IF EXISTS flow_executions_project_id_fkey;

ALTER TABLE public.flow_executions
  ADD CONSTRAINT flow_executions_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.user_projects(project_id)
  ON DELETE CASCADE;

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

ALTER TABLE public.flow_logs
  DROP CONSTRAINT IF EXISTS flow_logs_project_id_fkey;

ALTER TABLE public.flow_logs
  ADD CONSTRAINT flow_logs_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.user_projects(project_id)
  ON DELETE CASCADE;

DROP POLICY IF EXISTS flow_logs_select_own ON public.flow_logs;
CREATE POLICY flow_logs_select_own
  ON public.flow_logs
  FOR SELECT
  TO authenticated
  USING (
    flow_logs.project_id IS NULL OR EXISTS (
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
    flow_logs.project_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.user_projects p
      WHERE p.project_id = flow_logs.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_logs_update_own ON public.flow_logs;
DROP POLICY IF EXISTS flow_logs_delete_own ON public.flow_logs;

ALTER TABLE public.extraction_schemas
  DROP CONSTRAINT IF EXISTS extraction_schemas_project_id_fkey;

ALTER TABLE public.extraction_schemas
  ADD CONSTRAINT extraction_schemas_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.user_projects(project_id);

DROP POLICY IF EXISTS extraction_schemas_select_own ON public.extraction_schemas;
CREATE POLICY extraction_schemas_select_own
  ON public.extraction_schemas
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS extraction_schemas_insert_own ON public.extraction_schemas;
CREATE POLICY extraction_schemas_insert_own
  ON public.extraction_schemas
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      project_id IS NULL OR project_id IN (
        SELECT up.project_id
        FROM public.user_projects up
        WHERE up.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS extraction_schemas_update_own ON public.extraction_schemas;
CREATE POLICY extraction_schemas_update_own
  ON public.extraction_schemas
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      project_id IS NULL OR project_id IN (
        SELECT up.project_id
        FROM public.user_projects up
        WHERE up.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS extraction_schemas_delete_own ON public.extraction_schemas;
CREATE POLICY extraction_schemas_delete_own
  ON public.extraction_schemas
  FOR DELETE
  USING (owner_id = auth.uid());

DROP TABLE IF EXISTS public.projects;
