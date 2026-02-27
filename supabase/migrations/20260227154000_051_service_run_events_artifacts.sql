-- Migration 051: service run events + artifacts
-- Purpose:
-- - Enable real-time UI execution traces (logs/events) for service_runs.
-- - Persist artifacts (storage keys) produced by a run (manifests, outputs, bundles).

-- ---------------------------------------------------------------------------
-- 1. service_run_events: append-only events/logs for a run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_run_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.service_runs(run_id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'INFO'
    CHECK (level IN ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR')),
  message TEXT NOT NULL DEFAULT '',
  raw_event JSONB,
  source TEXT
);

COMMENT ON TABLE public.service_run_events IS
  'Append-only event/log stream for service_runs. Intended for real-time UI subscriptions.';

CREATE INDEX IF NOT EXISTS service_run_events_run_id_ts_idx
  ON public.service_run_events(run_id, ts ASC);

-- RLS: users can read events for runs in projects they own; service_role can write/read all.
ALTER TABLE public.service_run_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_run_events_select
  ON public.service_run_events;
CREATE POLICY service_run_events_select
  ON public.service_run_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_runs r
      JOIN public.projects p ON p.project_id = r.project_id
      WHERE r.run_id = service_run_events.run_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_run_events_service_role
  ON public.service_run_events;
CREATE POLICY service_run_events_service_role
  ON public.service_run_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.service_run_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_run_events TO authenticated;
GRANT ALL ON TABLE public.service_run_events TO service_role;

-- ---------------------------------------------------------------------------
-- 2. service_run_artifacts: pointers to stored outputs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_run_artifacts (
  artifact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.service_runs(run_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  sha256 TEXT,
  bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, name)
);

COMMENT ON TABLE public.service_run_artifacts IS
  'Artifacts produced by a service run (stored in Supabase Storage).';

CREATE INDEX IF NOT EXISTS service_run_artifacts_run_id_idx
  ON public.service_run_artifacts(run_id);

ALTER TABLE public.service_run_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_run_artifacts_select
  ON public.service_run_artifacts;
CREATE POLICY service_run_artifacts_select
  ON public.service_run_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_runs r
      JOIN public.projects p ON p.project_id = r.project_id
      WHERE r.run_id = service_run_artifacts.run_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_run_artifacts_service_role
  ON public.service_run_artifacts;
CREATE POLICY service_run_artifacts_service_role
  ON public.service_run_artifacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.service_run_artifacts FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_run_artifacts TO authenticated;
GRANT ALL ON TABLE public.service_run_artifacts TO service_role;

NOTIFY pgrst, 'reload schema';

