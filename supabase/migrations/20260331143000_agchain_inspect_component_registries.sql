BEGIN;

CREATE TABLE IF NOT EXISTS public.agchain_scorers (
  scorer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  scorer_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_scorers_project_name_unique UNIQUE (project_id, scorer_name)
);

CREATE TABLE IF NOT EXISTS public.agchain_scorer_versions (
  scorer_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorer_id UUID NOT NULL REFERENCES public.agchain_scorers(scorer_id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  metric_definitions_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  scorer_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_scorer_versions_scorer_version_unique UNIQUE (scorer_id, version_label)
);

CREATE TABLE IF NOT EXISTS public.agchain_tools (
  tool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  approval_mode TEXT NOT NULL DEFAULT 'manual',
  sandbox_requirement_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_tools_project_name_unique UNIQUE (project_id, tool_name)
);

CREATE TABLE IF NOT EXISTS public.agchain_tool_versions (
  tool_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.agchain_tools(tool_id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  input_schema_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  parallel_calls_allowed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_tool_versions_tool_version_unique UNIQUE (tool_id, version_label)
);

CREATE TABLE IF NOT EXISTS public.agchain_sandbox_profiles (
  sandbox_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_health_check_at TIMESTAMPTZ NULL,
  last_health_check_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_sandbox_profiles_project_provider_name_unique UNIQUE (project_id, provider, profile_name)
);

CREATE TABLE IF NOT EXISTS public.agchain_benchmark_version_scorers (
  benchmark_version_scorer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE,
  scorer_version_id UUID NOT NULL REFERENCES public.agchain_scorer_versions(scorer_version_id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  alias TEXT NULL,
  config_overrides_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT agchain_benchmark_version_scorers_position_unique UNIQUE (benchmark_version_id, position)
);

CREATE TABLE IF NOT EXISTS public.agchain_benchmark_version_tools (
  benchmark_version_tool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE,
  tool_version_id UUID NOT NULL REFERENCES public.agchain_tool_versions(tool_version_id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  alias TEXT NULL,
  config_overrides_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT agchain_benchmark_version_tools_position_unique UNIQUE (benchmark_version_id, position)
);

ALTER TABLE public.agchain_scorers
  ADD COLUMN IF NOT EXISTS latest_version_id UUID NULL;

ALTER TABLE public.agchain_tools
  ADD COLUMN IF NOT EXISTS latest_version_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agchain_scorers_latest_version_fk'
  ) THEN
    ALTER TABLE public.agchain_scorers
      ADD CONSTRAINT agchain_scorers_latest_version_fk
      FOREIGN KEY (latest_version_id)
      REFERENCES public.agchain_scorer_versions(scorer_version_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agchain_tools_latest_version_fk'
  ) THEN
    ALTER TABLE public.agchain_tools
      ADD CONSTRAINT agchain_tools_latest_version_fk
      FOREIGN KEY (latest_version_id)
      REFERENCES public.agchain_tool_versions(tool_version_id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.agchain_benchmark_versions
  ADD COLUMN IF NOT EXISTS dataset_version_id UUID NULL REFERENCES public.agchain_dataset_versions(dataset_version_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS task_file_ref TEXT NULL,
  ADD COLUMN IF NOT EXISTS task_definition_jsonb JSONB NULL,
  ADD COLUMN IF NOT EXISTS solver_plan_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sandbox_profile_id UUID NULL REFERENCES public.agchain_sandbox_profiles(sandbox_profile_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sandbox_overrides_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS model_roles_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS generate_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS eval_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS agchain_scorers_project_updated_idx
  ON public.agchain_scorers (project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS agchain_scorer_versions_scorer_created_idx
  ON public.agchain_scorer_versions (scorer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agchain_tools_project_updated_idx
  ON public.agchain_tools (project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS agchain_tool_versions_tool_created_idx
  ON public.agchain_tool_versions (tool_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agchain_sandbox_profiles_project_updated_idx
  ON public.agchain_sandbox_profiles (project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS agchain_benchmark_version_scorers_version_position_idx
  ON public.agchain_benchmark_version_scorers (benchmark_version_id, position);

CREATE INDEX IF NOT EXISTS agchain_benchmark_version_tools_version_position_idx
  ON public.agchain_benchmark_version_tools (benchmark_version_id, position);

ALTER TABLE public.agchain_scorers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_scorer_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_sandbox_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_benchmark_version_scorers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_benchmark_version_tools ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agchain_scorers FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_scorer_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_tools FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_tool_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_sandbox_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_benchmark_version_scorers FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_benchmark_version_tools FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_scorers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_scorer_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_tools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_tool_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_sandbox_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_benchmark_version_scorers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_benchmark_version_tools TO service_role;

COMMIT;
