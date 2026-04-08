CREATE TABLE IF NOT EXISTS public.runtime_probe_runs (
  probe_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_kind TEXT NOT NULL,
  check_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('ok', 'fail', 'error')),
  duration_ms DOUBLE PRECISION NOT NULL CHECK (duration_ms >= 0),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runtime_probe_runs_check_created_at
  ON public.runtime_probe_runs (check_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_probe_runs_kind_created_at
  ON public.runtime_probe_runs (probe_kind, created_at DESC);

ALTER TABLE public.runtime_probe_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.runtime_probe_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_probe_runs TO service_role;
