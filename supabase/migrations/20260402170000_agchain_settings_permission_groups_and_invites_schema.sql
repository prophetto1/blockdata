-- AGChain settings: permission groups and pending organization invites.

CREATE TABLE IF NOT EXISTS public.agchain_permission_groups (
  permission_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agchain_organizations(organization_id) ON DELETE CASCADE,
  group_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system_group BOOLEAN NOT NULL DEFAULT false,
  system_group_kind TEXT NULL CHECK (system_group_kind IN ('owners')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_permission_groups_unique_org_slug UNIQUE (organization_id, group_slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS agchain_permission_groups_unique_system_kind_idx
  ON public.agchain_permission_groups (organization_id, system_group_kind)
  WHERE system_group_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS agchain_permission_groups_organization_idx
  ON public.agchain_permission_groups (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.agchain_permission_group_memberships (
  permission_group_membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_group_id UUID NOT NULL REFERENCES public.agchain_permission_groups(permission_group_id) ON DELETE CASCADE,
  organization_member_id UUID NOT NULL REFERENCES public.agchain_organization_members(organization_member_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_permission_group_memberships_unique_group_member UNIQUE (permission_group_id, organization_member_id)
);

CREATE INDEX IF NOT EXISTS agchain_permission_group_memberships_group_idx
  ON public.agchain_permission_group_memberships (permission_group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agchain_permission_group_memberships_member_idx
  ON public.agchain_permission_group_memberships (organization_member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agchain_permission_group_grants (
  permission_group_grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_group_id UUID NOT NULL REFERENCES public.agchain_permission_groups(permission_group_id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'project')),
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_permission_group_grants_unique_group_scope_key UNIQUE (permission_group_id, scope_type, permission_key)
);

CREATE INDEX IF NOT EXISTS agchain_permission_group_grants_group_scope_idx
  ON public.agchain_permission_group_grants (permission_group_id, scope_type, permission_key);

CREATE TABLE IF NOT EXISTS public.agchain_organization_invites (
  organization_invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agchain_organizations(organization_id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_email_normalized TEXT NOT NULL,
  invite_token_hash TEXT NOT NULL,
  invited_by_user_id UUID NOT NULL,
  invite_status TEXT NOT NULL CHECK (invite_status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agchain_organization_invites_unique_pending_email_idx
  ON public.agchain_organization_invites (organization_id, invited_email_normalized)
  WHERE invite_status = 'pending';

CREATE INDEX IF NOT EXISTS agchain_organization_invites_org_status_idx
  ON public.agchain_organization_invites (organization_id, invite_status, created_at DESC);

CREATE INDEX IF NOT EXISTS agchain_organization_invites_email_idx
  ON public.agchain_organization_invites (organization_id, invited_email_normalized);

CREATE TABLE IF NOT EXISTS public.agchain_organization_invite_group_assignments (
  organization_invite_group_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_invite_id UUID NOT NULL REFERENCES public.agchain_organization_invites(organization_invite_id) ON DELETE CASCADE,
  permission_group_id UUID NOT NULL REFERENCES public.agchain_permission_groups(permission_group_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_organization_invite_group_assignments_unique_invite_group
    UNIQUE (organization_invite_id, permission_group_id)
);

CREATE INDEX IF NOT EXISTS agchain_organization_invite_group_assignments_invite_idx
  ON public.agchain_organization_invite_group_assignments (organization_invite_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_permission_groups_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_permission_groups_updated_at
    BEFORE UPDATE ON public.agchain_permission_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_organization_invites_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_organization_invites_updated_at
    BEFORE UPDATE ON public.agchain_organization_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
