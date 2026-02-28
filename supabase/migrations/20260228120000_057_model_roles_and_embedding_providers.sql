-- Model role catalog + role assignments + new embedding providers in agent_catalog

-- 1. Role catalog: operational roles that models can fill
CREATE TABLE IF NOT EXISTS public.model_role_catalog (
  role_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  allows_multiple BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.model_role_catalog (role_key, display_name, description, allows_multiple) VALUES
  ('assistant_chat', 'Assistant Chat', 'Powers the AI assistant pane', false),
  ('extraction', 'Block Extraction', 'Extracts structured data from blocks', false),
  ('embedding', 'Text Embedding', 'Generates vector embeddings', true),
  ('parsing', 'Document Parsing', 'Parses documents into blocks', false),
  ('reranking', 'Search Reranking', 'Reranks search results', false)
ON CONFLICT (role_key) DO NOTHING;

-- 2. Model-to-role assignments (admin-managed)
CREATE TABLE IF NOT EXISTS public.model_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL REFERENCES public.model_role_catalog(role_key) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_key, provider, model_id)
);

-- RLS
ALTER TABLE public.model_role_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_role_assignments ENABLE ROW LEVEL SECURITY;

-- Catalog: readable by authenticated
CREATE POLICY model_role_catalog_select ON public.model_role_catalog
  FOR SELECT TO authenticated USING (true);

-- Assignments: readable by authenticated, writable by service_role only
CREATE POLICY model_role_assignments_select ON public.model_role_assignments
  FOR SELECT TO authenticated USING (true);

-- Privileges
REVOKE ALL ON TABLE public.model_role_catalog FROM anon, authenticated;
REVOKE ALL ON TABLE public.model_role_assignments FROM anon, authenticated;
GRANT SELECT ON TABLE public.model_role_catalog TO authenticated;
GRANT SELECT ON TABLE public.model_role_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.model_role_catalog TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.model_role_assignments TO service_role;

-- 3. Seed default role assignments
INSERT INTO public.model_role_assignments (role_key, provider, model_id, priority, config_jsonb) VALUES
  ('assistant_chat', 'anthropic', 'claude-sonnet-4-5-20250929', 0, '{}'),
  ('extraction', 'anthropic', 'claude-sonnet-4-5-20250929', 0, '{}'),
  ('embedding', 'openai', 'text-embedding-3-small', 0, '{"dimensions": 1536}'),
  ('embedding', 'voyage', 'voyage-3-large', 1, '{"dimensions": 1024}'),
  ('parsing', 'google', 'gemini-2.5-flash', 0, '{}')
ON CONFLICT (role_key, provider, model_id) DO NOTHING;

-- 4. Add new embedding providers to agent_catalog
INSERT INTO public.agent_catalog (
  agent_slug, display_name, provider_family, enabled, default_model,
  supports_api_key, supports_provider_connections, supports_mcp_bindings, supports_mode
) VALUES
  ('voyage', 'Voyage AI', 'voyage', true, 'voyage-3-large', true, false, false, false),
  ('cohere', 'Cohere', 'cohere', true, 'embed-v4.0', true, false, false, false),
  ('jina', 'Jina AI', 'jina', true, 'jina-embeddings-v3', true, false, false, false)
ON CONFLICT (agent_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider_family = EXCLUDED.provider_family,
  enabled = EXCLUDED.enabled,
  default_model = EXCLUDED.default_model,
  supports_api_key = EXCLUDED.supports_api_key,
  updated_at = now();
