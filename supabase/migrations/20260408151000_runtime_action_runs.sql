CREATE TABLE IF NOT EXISTS public.runtime_action_runs (
  action_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_kind TEXT NOT NULL,
  check_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('ok', 'fail', 'error')),
  duration_ms DOUBLE PRECISION NOT NULL CHECK (duration_ms >= 0),
  request JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runtime_action_runs_check_created_at
  ON public.runtime_action_runs (check_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_action_runs_kind_created_at
  ON public.runtime_action_runs (action_kind, created_at DESC);

ALTER TABLE public.runtime_action_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.runtime_action_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_action_runs TO service_role;
