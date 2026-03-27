CREATE TABLE IF NOT EXISTS public.agchain_benchmarks (
  benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_slug TEXT NOT NULL UNIQUE,
  benchmark_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_draft_version_id UUID NULL,
  current_published_version_id UUID NULL,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agchain_benchmark_versions (
  benchmark_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id UUID NOT NULL REFERENCES public.agchain_benchmarks(benchmark_id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  version_status TEXT NOT NULL DEFAULT 'draft',
  plan_family TEXT NOT NULL DEFAULT 'custom',
  system_message TEXT NULL,
  payload_count INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'unknown',
  validation_issue_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_benchmark_versions_benchmark_version_unique UNIQUE (benchmark_id, version_label),
  CONSTRAINT agchain_benchmark_versions_status_check CHECK (
    version_status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT agchain_benchmark_versions_validation_status_check CHECK (
    validation_status IN ('pass', 'warn', 'fail', 'unknown')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_benchmark_steps (
  benchmark_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  step_kind TEXT NOT NULL,
  api_call_boundary TEXT NOT NULL DEFAULT 'own_call',
  inject_payloads JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_mode TEXT NOT NULL DEFAULT 'none',
  output_contract TEXT NULL,
  scorer_ref TEXT NULL,
  judge_prompt_ref TEXT NULL,
  judge_grades_step_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  step_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_benchmark_steps_version_order_unique UNIQUE (benchmark_version_id, step_order),
  CONSTRAINT agchain_benchmark_steps_version_step_id_unique UNIQUE (benchmark_version_id, step_id),
  CONSTRAINT agchain_benchmark_steps_kind_check CHECK (
    step_kind IN ('model', 'judge', 'deterministic_post', 'aggregation')
  ),
  CONSTRAINT agchain_benchmark_steps_call_boundary_check CHECK (
    api_call_boundary IN ('own_call', 'continue_call', 'non_model')
  ),
  CONSTRAINT agchain_benchmark_steps_scoring_mode_check CHECK (
    scoring_mode IN ('none', 'deterministic', 'judge')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_benchmark_model_targets (
  benchmark_model_target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE,
  model_target_id UUID NOT NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE CASCADE,
  selection_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_benchmark_model_targets_unique UNIQUE (benchmark_version_id, model_target_id, selection_role),
  CONSTRAINT agchain_benchmark_model_targets_selection_role_check CHECK (
    selection_role IN ('evaluated', 'judge')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id UUID NOT NULL REFERENCES public.agchain_benchmarks(benchmark_id) ON DELETE CASCADE,
  benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE,
  evaluated_model_target_id UUID NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE SET NULL,
  judge_model_target_id UUID NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_runs_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agchain_benchmarks_current_draft_version_fk'
  ) THEN
    ALTER TABLE public.agchain_benchmarks
      ADD CONSTRAINT agchain_benchmarks_current_draft_version_fk
      FOREIGN KEY (current_draft_version_id)
      REFERENCES public.agchain_benchmark_versions(benchmark_version_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agchain_benchmarks_current_published_version_fk'
  ) THEN
    ALTER TABLE public.agchain_benchmarks
      ADD CONSTRAINT agchain_benchmarks_current_published_version_fk
      FOREIGN KEY (current_published_version_id)
      REFERENCES public.agchain_benchmark_versions(benchmark_version_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agchain_benchmarks_owner_updated_idx
  ON public.agchain_benchmarks (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS agchain_benchmark_versions_benchmark_status_idx
  ON public.agchain_benchmark_versions (benchmark_id, version_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS agchain_benchmark_steps_version_order_idx
  ON public.agchain_benchmark_steps (benchmark_version_id, step_order);

CREATE INDEX IF NOT EXISTS agchain_benchmark_model_targets_version_role_idx
  ON public.agchain_benchmark_model_targets (benchmark_version_id, selection_role);

CREATE INDEX IF NOT EXISTS agchain_runs_benchmark_status_submitted_idx
  ON public.agchain_runs (benchmark_id, status, submitted_at DESC);

ALTER TABLE public.agchain_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_benchmark_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_benchmark_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_benchmark_model_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agchain_benchmarks FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_benchmark_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_benchmark_steps FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_benchmark_model_targets FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_runs FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_benchmarks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_benchmark_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_benchmark_steps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_benchmark_model_targets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_runs TO service_role;
