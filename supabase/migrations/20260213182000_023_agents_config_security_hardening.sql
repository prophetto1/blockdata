-- Security hardening for agent configuration tables.
-- Goal: browser can read its own configs, but cannot write server-trusted fields directly.

-- Enforce per-user unique keywords (empty keyword allowed across rows).
CREATE UNIQUE INDEX IF NOT EXISTS user_agent_configs_unique_keyword_per_user
  ON public.user_agent_configs(user_id, keyword)
  WHERE keyword <> '';

-- Lock down direct table writes from the browser.
REVOKE ALL ON TABLE public.user_agent_configs FROM anon, authenticated;

-- Allow authenticated users to read their own rows (RLS still applies).
GRANT SELECT (
  id,
  user_id,
  agent_slug,
  keyword,
  model,
  mode,
  mcp_server_ids,
  config_jsonb,
  is_ready,
  is_default,
  created_at,
  updated_at
) ON TABLE public.user_agent_configs TO authenticated;

-- Service role can perform writes (Edge functions use this for privileged updates).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_agent_configs TO service_role;

