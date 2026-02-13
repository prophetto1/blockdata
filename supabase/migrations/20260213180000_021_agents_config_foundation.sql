-- Agents configuration foundation (config-first; execution deferred)

-- Catalog of agent templates (system-defined)
CREATE TABLE IF NOT EXISTS public.agent_catalog (
  agent_slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  provider_family TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_model TEXT NOT NULL DEFAULT '',
  supports_api_key BOOLEAN NOT NULL DEFAULT true,
  supports_provider_connections BOOLEAN NOT NULL DEFAULT false,
  supports_mcp_bindings BOOLEAN NOT NULL DEFAULT true,
  supports_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user agent configuration (keyword/model/mcp bindings; secrets live elsewhere)
CREATE TABLE IF NOT EXISTS public.user_agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_slug TEXT NOT NULL REFERENCES public.agent_catalog(agent_slug) ON DELETE RESTRICT,
  keyword TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  mode TEXT NULL,
  mcp_server_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_slug)
);

-- Enforce at most one default agent per user.
CREATE UNIQUE INDEX IF NOT EXISTS user_agent_configs_one_default_per_user
  ON public.user_agent_configs(user_id)
  WHERE is_default = true;

-- RLS
ALTER TABLE public.agent_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agent_configs ENABLE ROW LEVEL SECURITY;

-- Catalog is readable to authenticated users.
DROP POLICY IF EXISTS agent_catalog_select ON public.agent_catalog;
CREATE POLICY agent_catalog_select ON public.agent_catalog
  FOR SELECT TO authenticated
  USING (true);

-- Users can only read/write their own agent configs.
DROP POLICY IF EXISTS user_agent_configs_select ON public.user_agent_configs;
CREATE POLICY user_agent_configs_select ON public.user_agent_configs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_agent_configs_insert ON public.user_agent_configs;
CREATE POLICY user_agent_configs_insert ON public.user_agent_configs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_agent_configs_update ON public.user_agent_configs;
CREATE POLICY user_agent_configs_update ON public.user_agent_configs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_agent_configs_delete ON public.user_agent_configs;
CREATE POLICY user_agent_configs_delete ON public.user_agent_configs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Privileges
REVOKE ALL ON TABLE public.agent_catalog FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_agent_configs FROM anon, authenticated;

GRANT SELECT ON TABLE public.agent_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_agent_configs TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_catalog TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_agent_configs TO service_role;

-- Seed catalog
INSERT INTO public.agent_catalog (
  agent_slug,
  display_name,
  provider_family,
  enabled,
  default_model,
  supports_api_key,
  supports_provider_connections,
  supports_mcp_bindings,
  supports_mode
) VALUES
  ('anthropic', 'Anthropic (Claude)', 'anthropic', true, 'claude-sonnet-4-5-20250929', true, false, true, false),
  ('openai', 'OpenAI (GPT)', 'openai', true, 'gpt-4.1-mini', true, false, true, false),
  ('google', 'Google (Gemini / Vertex)', 'google', true, 'gemini-2.5-flash', true, true, true, false),
  ('custom', 'Custom (OpenAI-compatible)', 'custom', true, '', true, false, true, false)
ON CONFLICT (agent_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider_family = EXCLUDED.provider_family,
  enabled = EXCLUDED.enabled,
  default_model = EXCLUDED.default_model,
  supports_api_key = EXCLUDED.supports_api_key,
  supports_provider_connections = EXCLUDED.supports_provider_connections,
  supports_mcp_bindings = EXCLUDED.supports_mcp_bindings,
  supports_mode = EXCLUDED.supports_mode,
  updated_at = now();

