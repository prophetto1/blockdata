CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.auth_oauth_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL
    CHECK (provider IN ('google', 'github')),
  attempt_secret_hash TEXT NOT NULL,
  redirect_origin TEXT NOT NULL,
  next_path TEXT,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'callback_received', 'session_detected', 'completed', 'failed')),
  result TEXT
    CHECK (result IS NULL OR result IN ('welcome', 'app', 'login_error')),
  failure_category TEXT
    CHECK (
      failure_category IS NULL
      OR failure_category IN ('provider_disabled', 'callback_error', 'no_session', 'profile_lookup_failed', 'unexpected')
    ),
  callback_error_code TEXT,
  profile_state TEXT
    CHECK (profile_state IS NULL OR profile_state IN ('missing', 'present')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  callback_received_at TIMESTAMPTZ,
  session_detected_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_oauth_attempts_created_at_desc
  ON public.auth_oauth_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_oauth_attempts_provider
  ON public.auth_oauth_attempts (provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_oauth_attempts_status
  ON public.auth_oauth_attempts (status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_auth_oauth_attempts_updated_at'
  ) THEN
    CREATE TRIGGER set_auth_oauth_attempts_updated_at
    BEFORE UPDATE ON public.auth_oauth_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.auth_oauth_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_oauth_attempts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_oauth_attempts TO service_role;
