CREATE TABLE IF NOT EXISTS public.blockdata_ai_provider_registry (
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

CREATE INDEX IF NOT EXISTS blockdata_ai_provider_registry_enabled_sort_idx
  ON public.blockdata_ai_provider_registry (enabled, provider_category, sort_order, display_name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_blockdata_ai_provider_registry_updated_at'
  ) THEN
    CREATE TRIGGER set_blockdata_ai_provider_registry_updated_at
    BEFORE UPDATE ON public.blockdata_ai_provider_registry
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.blockdata_ai_provider_models (
  provider_model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  provider_slug TEXT NOT NULL REFERENCES public.blockdata_ai_provider_registry(provider_slug) ON DELETE RESTRICT,
  model_id TEXT NOT NULL,
  qualified_model TEXT NOT NULL,
  api_base TEXT NULL,
  auth_kind TEXT NOT NULL,
  config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blockdata_ai_provider_models_provider_model_unique UNIQUE (provider_slug, model_id)
);

CREATE INDEX IF NOT EXISTS blockdata_ai_provider_models_provider_idx
  ON public.blockdata_ai_provider_models (provider_slug, enabled, sort_order, label);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_blockdata_ai_provider_models_updated_at'
  ) THEN
    CREATE TRIGGER set_blockdata_ai_provider_models_updated_at
    BEFORE UPDATE ON public.blockdata_ai_provider_models
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

INSERT INTO public.blockdata_ai_provider_registry (
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
    'OpenAI provider family'
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
    'google',
    'Google',
    'cloud_provider',
    'vertex_ai',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'https://cloud.google.com/vertex-ai/docs',
    '["service_account", "api_key"]'::jsonb,
    'http_google_models',
    '{"text": true, "multimodal": true}'::jsonb,
    false,
    true,
    true,
    30,
    'Google-hosted model provider family'
  ),
  (
    'voyage',
    'Voyage',
    'model_provider',
    'basic_api_key',
    'VOYAGE_API_KEY',
    'https://docs.voyageai.com',
    '["api_key"]'::jsonb,
    'provider_default',
    '{"embedding": true}'::jsonb,
    false,
    true,
    true,
    40,
    'Voyage embedding provider family'
  ),
  (
    'cohere',
    'Cohere',
    'model_provider',
    'basic_api_key',
    'COHERE_API_KEY',
    'https://docs.cohere.com',
    '["api_key"]'::jsonb,
    'provider_default',
    '{"embedding": true, "reranking": true}'::jsonb,
    false,
    true,
    true,
    50,
    'Cohere provider family'
  ),
  (
    'jina',
    'Jina',
    'model_provider',
    'basic_api_key',
    'JINA_API_KEY',
    'https://jina.ai/embeddings',
    '["api_key"]'::jsonb,
    'provider_default',
    '{"embedding": true}'::jsonb,
    false,
    true,
    true,
    60,
    'Jina provider family'
  ),
  (
    'custom',
    'Custom',
    'model_provider',
    'basic_api_key',
    NULL,
    NULL,
    '["api_key", "access_token", "credential_json", "service_account", "connection"]'::jsonb,
    'custom_http',
    '{}'::jsonb,
    true,
    true,
    true,
    900,
    'Operator-defined custom provider family'
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

INSERT INTO public.blockdata_ai_provider_registry (
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
  trim(assignments.provider) AS provider_slug,
  initcap(replace(trim(assignments.provider), '-', ' ')) AS display_name,
  'model_provider',
  CASE
    WHEN trim(assignments.provider) = 'google' THEN 'vertex_ai'
    ELSE 'basic_api_key'
  END,
  NULL,
  NULL,
  CASE
    WHEN trim(assignments.provider) = 'google' THEN '["service_account", "api_key"]'::jsonb
    ELSE '["api_key"]'::jsonb
  END,
  'provider_default',
  '{}'::jsonb,
  false,
  true,
  false,
  950,
  'Imported from public.model_role_assignments as a disabled inferred provider row.'
FROM public.model_role_assignments assignments
WHERE trim(assignments.provider) <> ''
ON CONFLICT (provider_slug) DO NOTHING;

INSERT INTO public.blockdata_ai_provider_models (
  label,
  provider_slug,
  model_id,
  qualified_model,
  api_base,
  auth_kind,
  config_jsonb,
  capabilities_jsonb,
  enabled,
  sort_order,
  notes
)
SELECT
  initcap(replace(seed.model_id, '-', ' ')) AS label,
  seed.provider_slug,
  seed.model_id,
  seed.provider_slug || '/' || seed.model_id AS qualified_model,
  NULL AS api_base,
  CASE
    WHEN seed.provider_slug = 'google' THEN 'service_account'
    ELSE 'api_key'
  END AS auth_kind,
  '{}'::jsonb AS config_jsonb,
  jsonb_build_object(
    'seed_source', 'model_role_assignments',
    'role_keys', to_jsonb(seed.role_keys)
  ) AS capabilities_jsonb,
  true AS enabled,
  100 AS sort_order,
  'Seeded from public.model_role_assignments.' AS notes
FROM (
  SELECT
    trim(assignments.provider) AS provider_slug,
    trim(assignments.model_id) AS model_id,
    array_agg(DISTINCT assignments.role_key ORDER BY assignments.role_key) AS role_keys
  FROM public.model_role_assignments assignments
  WHERE trim(assignments.provider) <> ''
    AND trim(assignments.model_id) <> ''
  GROUP BY trim(assignments.provider), trim(assignments.model_id)
) AS seed
ON CONFLICT (provider_slug, model_id) DO NOTHING;

ALTER TABLE public.blockdata_ai_provider_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockdata_ai_provider_models ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.blockdata_ai_provider_registry FROM anon, authenticated;
REVOKE ALL ON TABLE public.blockdata_ai_provider_models FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blockdata_ai_provider_registry TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blockdata_ai_provider_models TO service_role;
