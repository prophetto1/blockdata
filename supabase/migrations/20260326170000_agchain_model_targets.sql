CREATE TABLE IF NOT EXISTS public.agchain_model_targets (
  model_target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  provider_slug TEXT NOT NULL,
  provider_qualifier TEXT NULL,
  model_name TEXT NOT NULL,
  qualified_model TEXT NOT NULL,
  api_base TEXT NULL,
  auth_kind TEXT NOT NULL,
  credential_source_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_args_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  supports_evaluated BOOLEAN NOT NULL DEFAULT true,
  supports_judge BOOLEAN NOT NULL DEFAULT false,
  capabilities_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  probe_strategy TEXT NOT NULL DEFAULT 'provider_default',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  health_checked_at TIMESTAMPTZ NULL,
  last_latency_ms INTEGER NULL,
  last_error_code TEXT NULL,
  last_error_message TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_model_targets_identity_unique UNIQUE NULLS NOT DISTINCT (
    provider_slug,
    provider_qualifier,
    qualified_model,
    api_base
  ),
  CONSTRAINT agchain_model_targets_auth_kind_check CHECK (
    auth_kind IN ('none', 'api_key', 'oauth', 'service_account', 'custom')
  ),
  CONSTRAINT agchain_model_targets_probe_strategy_check CHECK (
    probe_strategy IN ('provider_default', 'http_openai_models', 'http_anthropic_models', 'http_google_models', 'custom_http', 'none')
  ),
  CONSTRAINT agchain_model_targets_health_status_check CHECK (
    health_status IN ('healthy', 'degraded', 'error', 'unknown')
  )
);

CREATE TABLE IF NOT EXISTS public.agchain_model_health_checks (
  health_check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_target_id UUID NOT NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,
  probe_strategy TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT agchain_model_health_checks_probe_strategy_check CHECK (
    probe_strategy IN ('provider_default', 'http_openai_models', 'http_anthropic_models', 'http_google_models', 'custom_http', 'none')
  ),
  CONSTRAINT agchain_model_health_checks_status_check CHECK (
    status IN ('healthy', 'degraded', 'error', 'unknown')
  )
);

CREATE INDEX IF NOT EXISTS agchain_model_targets_provider_slug_idx
  ON public.agchain_model_targets (provider_slug);

CREATE INDEX IF NOT EXISTS agchain_model_targets_health_status_idx
  ON public.agchain_model_targets (health_status);

CREATE INDEX IF NOT EXISTS agchain_model_targets_enabled_idx
  ON public.agchain_model_targets (enabled);

CREATE INDEX IF NOT EXISTS agchain_model_health_checks_target_checked_at_idx
  ON public.agchain_model_health_checks (model_target_id, checked_at DESC);

ALTER TABLE public.agchain_model_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agchain_model_health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agchain_model_targets_select_authenticated ON public.agchain_model_targets;
CREATE POLICY agchain_model_targets_select_authenticated
  ON public.agchain_model_targets
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS agchain_model_health_checks_select_authenticated ON public.agchain_model_health_checks;
CREATE POLICY agchain_model_health_checks_select_authenticated
  ON public.agchain_model_health_checks
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.agchain_model_targets FROM anon, authenticated;
REVOKE ALL ON TABLE public.agchain_model_health_checks FROM anon, authenticated;

GRANT SELECT (
  model_target_id,
  label,
  provider_slug,
  provider_qualifier,
  model_name,
  qualified_model,
  api_base,
  auth_kind,
  model_args_jsonb,
  supports_evaluated,
  supports_judge,
  capabilities_jsonb,
  enabled,
  probe_strategy,
  health_status,
  health_checked_at,
  last_latency_ms,
  last_error_code,
  last_error_message,
  notes,
  created_at,
  updated_at
) ON TABLE public.agchain_model_targets TO authenticated;

GRANT SELECT (
  health_check_id,
  model_target_id,
  provider_slug,
  probe_strategy,
  status,
  latency_ms,
  error_code,
  error_message,
  checked_at,
  metadata_jsonb
) ON TABLE public.agchain_model_health_checks TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_model_targets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_model_health_checks TO service_role;
