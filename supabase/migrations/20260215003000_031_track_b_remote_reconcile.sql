-- Migration 031: Track B reconciliation after remote version-history repair
-- Purpose: enforce presence of objects that may be missing when prior versions
-- were marked applied without executing SQL.

-- ---------------------------------------------------------------------------
-- 1) Worker dequeue RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_unstructured_run_batch(
  p_batch_size INTEGER,
  p_worker_id TEXT
)
RETURNS TABLE(run_uid UUID)
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_batch_size INTEGER;
BEGIN
  v_batch_size := GREATEST(1, LEAST(COALESCE(p_batch_size, 1), 20));

  RETURN QUERY
  WITH claimable AS (
    SELECT r.run_uid
    FROM public.unstructured_workflow_runs_v2 r
    WHERE r.status = 'queued'
    ORDER BY r.created_at, r.run_uid
    LIMIT v_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.unstructured_workflow_runs_v2 r
  SET status = 'running',
      started_at = COALESCE(r.started_at, NOW())
  FROM claimable c
  WHERE r.run_uid = c.run_uid
  RETURNING r.run_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_unstructured_run_batch(INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_unstructured_run_batch(INTEGER, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Track B audit events table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.track_b_audit_events_v2 (
  audit_uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_b_v2(workspace_id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(project_id) ON DELETE SET NULL,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('run_create', 'run_cancel', 'workflow_edit', 'schema_run_trigger')),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_track_b_audit_events_v2_workspace_occurred
  ON public.track_b_audit_events_v2(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_b_audit_events_v2_project_occurred
  ON public.track_b_audit_events_v2(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_b_audit_events_v2_action_occurred
  ON public.track_b_audit_events_v2(action, occurred_at DESC);

ALTER TABLE public.track_b_audit_events_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS track_b_audit_events_v2_select_member ON public.track_b_audit_events_v2;
CREATE POLICY track_b_audit_events_v2_select_member
  ON public.track_b_audit_events_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 m
      WHERE m.workspace_id = track_b_audit_events_v2.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Project workspace default trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_default_workspace_to_project_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_b_v2 (owner_id, workspace_name)
  VALUES (NEW.owner_id, 'Default Workspace')
  ON CONFLICT (owner_id, workspace_name) DO NOTHING;

  SELECT workspace_id INTO v_workspace_id
  FROM public.workspace_b_v2
  WHERE owner_id = NEW.owner_id
    AND workspace_name = 'Default Workspace'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve default workspace for project owner: %', NEW.owner_id;
  END IF;

  INSERT INTO public.workspace_b_memberships_v2 (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, NEW.owner_id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  NEW.workspace_id := v_workspace_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_default_workspace_to_project_v2 ON public.projects;
CREATE TRIGGER trg_assign_default_workspace_to_project_v2
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_workspace_to_project_v2();
