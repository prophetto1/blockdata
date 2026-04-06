CREATE TABLE IF NOT EXISTS public.agchain_provider_registry (
  provider_slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  provider_category TEXT NOT NULL CHECK (
    provider_category IN ('model_provider', 'cloud_provider')
  ),
  credential_form_kind TEXT NOT NULL CHECK (
    credential_form_kind IN ('basic_api_key', 'vertex_ai')
  ),
  env_var_name TEXT NULL,
  docs_url TEXT NULL,
  supported_auth_kinds_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_probe_strategy TEXT NOT NULL DEFAULT 'provider_default' CHECK (
    default_probe_strategy IN (
      'provider_default',
      'http_openai_models',
      'http_anthropic_models',
      'http_google_models',
      'custom_http',
      'none'
    )
  ),
  default_capabilities_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  supports_custom_base_url BOOLEAN NOT NULL DEFAULT false,
  supports_model_args BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agchain_provider_registry_enabled_sort_idx
  ON public.agchain_provider_registry (enabled, provider_category, sort_order, display_name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_provider_registry_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_provider_registry_updated_at
    BEFORE UPDATE ON public.agchain_provider_registry
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

INSERT INTO public.agchain_provider_registry (
  provider_slug,
  display_name,
  provider_category,
  credential_form_kind,
  env_var_name,
  docs_url,
  supported_auth_kinds_jsonb,
  default_probe_strategy,
  default_capabilities_jsonb,
  supports_custom_base_url,
  supports_model_args,
  enabled,
  sort_order,
  notes
)
VALUES
  (
    'openai',
    'OpenAI',
    'model_provider',
    'basic_api_key',
    'OPENAI_API_KEY',
    'https://platform.openai.com/docs/api-reference',
    '["api_key"]'::jsonb,
    'http_openai_models',
    '{"text": true, "json": true}'::jsonb,
    true,
    true,
    true,
    10,
    'OpenAI-compatible provider family'
  ),
  (
    'anthropic',
    'Anthropic',
    'model_provider',
    'basic_api_key',
    'ANTHROPIC_API_KEY',
    'https://docs.anthropic.com/en/api/getting-started',
    '["api_key"]'::jsonb,
    'http_anthropic_models',
    '{"text": true}'::jsonb,
    false,
    true,
    true,
    20,
    'Anthropic provider family'
  ),
  (
    'vertex-ai',
    'Vertex AI',
    'cloud_provider',
    'vertex_ai',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'https://cloud.google.com/vertex-ai/docs',
    '["service_account", "api_key"]'::jsonb,
    'http_google_models',
    '{"text": true}'::jsonb,
    false,
    true,
    true,
    30,
    'Vertex AI provider family'
  )
ON CONFLICT (provider_slug) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  provider_category = EXCLUDED.provider_category,
  credential_form_kind = EXCLUDED.credential_form_kind,
  env_var_name = EXCLUDED.env_var_name,
  docs_url = EXCLUDED.docs_url,
  supported_auth_kinds_jsonb = EXCLUDED.supported_auth_kinds_jsonb,
  default_probe_strategy = EXCLUDED.default_probe_strategy,
  default_capabilities_jsonb = EXCLUDED.default_capabilities_jsonb,
  supports_custom_base_url = EXCLUDED.supports_custom_base_url,
  supports_model_args = EXCLUDED.supports_model_args,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.agchain_provider_registry (
  provider_slug,
  display_name,
  provider_category,
  credential_form_kind,
  env_var_name,
  docs_url,
  supported_auth_kinds_jsonb,
  default_probe_strategy,
  default_capabilities_jsonb,
  supports_custom_base_url,
  supports_model_args,
  enabled,
  sort_order,
  notes
)
SELECT DISTINCT
  targets.provider_slug,
  initcap(replace(targets.provider_slug, '-', ' ')),
  'model_provider',
  CASE
    WHEN targets.provider_slug = 'vertex-ai' THEN 'vertex_ai'
    ELSE 'basic_api_key'
  END,
  NULL,
  NULL,
  CASE
    WHEN targets.provider_slug = 'vertex-ai' THEN '["service_account", "api_key"]'::jsonb
    ELSE '["api_key"]'::jsonb
  END,
  'provider_default',
  '{}'::jsonb,
  false,
  true,
  false,
  900,
  'Imported from existing AGChain model targets as a disabled legacy provider row.'
FROM public.agchain_model_targets targets
WHERE NOT EXISTS (
  SELECT 1
  FROM public.agchain_provider_registry registry
  WHERE registry.provider_slug = targets.provider_slug
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agchain_model_targets_provider_slug_fk'
  ) THEN
    ALTER TABLE public.agchain_model_targets
      ADD CONSTRAINT agchain_model_targets_provider_slug_fk
      FOREIGN KEY (provider_slug)
      REFERENCES public.agchain_provider_registry(provider_slug)
      ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.agchain_provider_registry ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agchain_provider_registry FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_provider_registry TO service_role;
