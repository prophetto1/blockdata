-- Migration 030: Track B audit events

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
