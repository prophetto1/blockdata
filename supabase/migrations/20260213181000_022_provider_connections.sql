-- Provider connections for non-key auth methods (v1: Vertex AI service account)

CREATE TABLE IF NOT EXISTS public.user_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error')),
  credential_encrypted TEXT NULL,
  metadata_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, connection_type)
);

ALTER TABLE public.user_provider_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connection metadata/status.
DROP POLICY IF EXISTS user_provider_connections_select ON public.user_provider_connections;
CREATE POLICY user_provider_connections_select ON public.user_provider_connections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Lock down table privileges so the browser cannot write secrets directly.
REVOKE ALL ON TABLE public.user_provider_connections FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  provider,
  connection_type,
  status,
  metadata_jsonb,
  created_at,
  updated_at
) ON TABLE public.user_provider_connections TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_provider_connections TO service_role;

