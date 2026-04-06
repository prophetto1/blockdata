CREATE TABLE IF NOT EXISTS public.agchain_organization_provider_credentials (
  organization_provider_credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agchain_organizations(organization_id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL REFERENCES public.agchain_provider_registry(provider_slug) ON DELETE RESTRICT,
  credential_payload_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_organization_provider_credentials_unique_scope UNIQUE (organization_id, provider_slug)
);

CREATE INDEX IF NOT EXISTS agchain_organization_provider_credentials_scope_idx
  ON public.agchain_organization_provider_credentials (organization_id, provider_slug);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_organization_provider_credentials_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_organization_provider_credentials_updated_at
    BEFORE UPDATE ON public.agchain_organization_provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.agchain_organization_provider_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agchain_organization_provider_credentials FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agchain_organization_provider_credentials TO service_role;
