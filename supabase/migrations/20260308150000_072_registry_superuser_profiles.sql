-- Migration 072: registry superuser profiles
-- Purpose:
-- - Move superuser designation from env allowlists to a database-backed registry.
-- - Keep the gate email-based so designated addresses can be provisioned before first login.
-- - Give service_role-backed admin surfaces a single source of truth for superuser access.

CREATE TABLE IF NOT EXISTS public.registry_superuser_profiles (
  superuser_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  notes TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registry_superuser_profiles_email_not_blank CHECK (btrim(email) <> '')
);

COMMENT ON TABLE public.registry_superuser_profiles IS
  'Registry of designated superuser identities. Superuser access is granted by normalized email match.';
COMMENT ON COLUMN public.registry_superuser_profiles.email IS
  'Original email entered by the operator.';
COMMENT ON COLUMN public.registry_superuser_profiles.email_normalized IS
  'Lowercased and trimmed email used for access checks.';
COMMENT ON COLUMN public.registry_superuser_profiles.is_active IS
  'Soft switch for temporarily disabling a designated superuser email without deleting the row.';
COMMENT ON COLUMN public.registry_superuser_profiles.granted_by IS
  'Auth user that granted or last curated this superuser designation.';

CREATE UNIQUE INDEX IF NOT EXISTS registry_superuser_profiles_email_normalized_idx
  ON public.registry_superuser_profiles (email_normalized);

CREATE INDEX IF NOT EXISTS registry_superuser_profiles_active_idx
  ON public.registry_superuser_profiles (is_active, email_normalized);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_registry_superuser_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_registry_superuser_profiles_updated_at
    BEFORE UPDATE ON public.registry_superuser_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.registry_superuser_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.registry_superuser_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registry_superuser_profiles TO service_role;

