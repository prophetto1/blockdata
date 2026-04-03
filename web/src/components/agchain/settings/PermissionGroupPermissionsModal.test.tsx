import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionGroupPermissionsModal } from './PermissionGroupPermissionsModal';

afterEach(() => {
  cleanup();
});

describe('PermissionGroupPermissionsModal', () => {
  it('renders grouped organization and project grants plus the v1 policy notice', () => {
    render(
      <PermissionGroupPermissionsModal
        open
        onOpenChange={vi.fn()}
        loading={false}
        error={null}
        detail={{
          group: {
            permission_group_id: 'group-owners',
            organization_id: 'org-1',
            name: 'Owners',
            group_slug: 'owners',
            description: 'System owners',
            is_system_group: true,
            system_group_kind: 'owners',
          },
          grants: {
            organization: ['organization.members.read', 'organization.permission_groups.read'],
            project: ['project.create'],
          },
          group_policy_notice:
            'Custom groups expose only organization-level grant editing in V1. Protected system groups may carry seeded project-level grants.',
        }}
      />,
    );

    expect(screen.getByText('Owners')).toBeInTheDocument();
    expect(screen.getByText('organization.members.read')).toBeInTheDocument();
    expect(screen.getByText('organization.permission_groups.read')).toBeInTheDocument();
    expect(screen.getByText('project.create')).toBeInTheDocument();
    expect(screen.getByText(/protected system groups may carry seeded project-level grants/i)).toBeInTheDocument();
  });
});
