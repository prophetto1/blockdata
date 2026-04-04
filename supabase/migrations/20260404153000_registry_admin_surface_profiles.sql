-- Admin surface registry split
-- Purpose:
-- - Create separate designated-email registries for Blockdata Admin and AGChain Admin.
-- - Preserve the existing email-based gating pattern used by registry_superuser_profiles.
-- - Backfill current active superusers into both new registries for rollout continuity.

CREATE TABLE IF NOT EXISTS public.registry_blockdata_admin_profiles (
  blockdata_admin_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  notes TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registry_blockdata_admin_profiles_email_not_blank CHECK (btrim(email) <> '')
);

COMMENT ON TABLE public.registry_blockdata_admin_profiles IS
  'Registry of designated Blockdata Admin identities. Access is granted by normalized email match.';

CREATE UNIQUE INDEX IF NOT EXISTS registry_blockdata_admin_profiles_email_normalized_idx
  ON public.registry_blockdata_admin_profiles (email_normalized);

CREATE INDEX IF NOT EXISTS registry_blockdata_admin_profiles_active_idx
  ON public.registry_blockdata_admin_profiles (is_active, email_normalized);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_registry_blockdata_admin_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_registry_blockdata_admin_profiles_updated_at
    BEFORE UPDATE ON public.registry_blockdata_admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.registry_blockdata_admin_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registry_blockdata_admin_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registry_blockdata_admin_profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.registry_agchain_admin_profiles (
  agchain_admin_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  notes TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registry_agchain_admin_profiles_email_not_blank CHECK (btrim(email) <> '')
);

COMMENT ON TABLE public.registry_agchain_admin_profiles IS
  'Registry of designated AGChain Admin identities. Access is granted by normalized email match.';

CREATE UNIQUE INDEX IF NOT EXISTS registry_agchain_admin_profiles_email_normalized_idx
  ON public.registry_agchain_admin_profiles (email_normalized);

CREATE INDEX IF NOT EXISTS registry_agchain_admin_profiles_active_idx
  ON public.registry_agchain_admin_profiles (is_active, email_normalized);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_registry_agchain_admin_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_registry_agchain_admin_profiles_updated_at
    BEFORE UPDATE ON public.registry_agchain_admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.registry_agchain_admin_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registry_agchain_admin_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registry_agchain_admin_profiles TO service_role;

INSERT INTO public.registry_blockdata_admin_profiles (email, is_active, display_name, notes, granted_by, created_at, updated_at)
SELECT
  email,
  true,
  display_name,
  COALESCE(notes, 'Backfilled from registry_superuser_profiles during admin surface split'),
  granted_by,
  created_at,
  updated_at
FROM public.registry_superuser_profiles
WHERE is_active = true
ON CONFLICT (email_normalized) DO NOTHING;

INSERT INTO public.registry_agchain_admin_profiles (email, is_active, display_name, notes, granted_by, created_at, updated_at)
SELECT
  email,
  true,
  display_name,
  COALESCE(notes, 'Backfilled from registry_superuser_profiles during admin surface split'),
  granted_by,
  created_at,
  updated_at
FROM public.registry_superuser_profiles
WHERE is_active = true
ON CONFLICT (email_normalized) DO NOTHING;
