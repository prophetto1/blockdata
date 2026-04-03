-- Seed protected Owners groups and copy current organization admins into them.

INSERT INTO public.agchain_permission_groups (
  organization_id,
  group_slug,
  name,
  description,
  is_system_group,
  system_group_kind
)
SELECT
  organization_id,
  'owners',
  'Owners',
  'Protected system group for organization owners.',
  true,
  'owners'
FROM public.agchain_organizations
ON CONFLICT (organization_id, group_slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system_group = true,
  system_group_kind = 'owners';

INSERT INTO public.agchain_permission_group_grants (
  permission_group_id,
  scope_type,
  permission_key
)
SELECT
  groups.permission_group_id,
  grants.scope_type,
  grants.permission_key
FROM public.agchain_permission_groups groups
CROSS JOIN (
  VALUES
    ('organization', 'organization.settings.manage'),
    ('organization', 'organization.members.read'),
    ('organization', 'organization.members.invite'),
    ('organization', 'organization.members.remove'),
    ('organization', 'organization.permission_groups.read'),
    ('organization', 'organization.permission_groups.manage'),
    ('project', 'project.create'),
    ('project', 'project.read'),
    ('project', 'project.update'),
    ('project', 'project.delete'),
    ('project', 'project.manage_access')
) AS grants(scope_type, permission_key)
WHERE groups.system_group_kind = 'owners'
ON CONFLICT (permission_group_id, scope_type, permission_key) DO NOTHING;

INSERT INTO public.agchain_permission_group_memberships (
  permission_group_id,
  organization_member_id
)
SELECT
  groups.permission_group_id,
  members.organization_member_id
FROM public.agchain_permission_groups groups
JOIN public.agchain_organization_members members
  ON members.organization_id = groups.organization_id
WHERE groups.system_group_kind = 'owners'
  AND members.membership_role = 'organization_admin'
  AND members.membership_status = 'active'
ON CONFLICT (permission_group_id, organization_member_id) DO NOTHING;
