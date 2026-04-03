import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreatePermissionGroupModal } from './CreatePermissionGroupModal';

afterEach(() => {
  cleanup();
});

describe('CreatePermissionGroupModal', () => {
  it('creates a permission group from backend-driven organization permission definitions only', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <CreatePermissionGroupModal
        open
        onOpenChange={vi.fn()}
        creating={false}
        error={null}
        definitions={{
          organization_permissions: [
            {
              permission_key: 'organization.members.read',
              label: 'Read members',
              description: 'View organization members and group assignments.',
              user_assignable: true,
            },
            {
              permission_key: 'organization.permission_groups.read',
              label: 'Read permission groups',
              description: 'View permission groups and assigned grants.',
              user_assignable: true,
            },
          ],
          project_permissions: [
            {
              permission_key: 'project.create',
              label: 'Create projects',
              description: 'Create AGChain projects inside this organization.',
              user_assignable: false,
            },
          ],
          protected_system_groups: [
            {
              system_group_kind: 'owners',
              name: 'Owners',
              deletable: false,
              last_member_removable: false,
            },
          ],
        }}
        onCreate={onCreate}
      />,
    );

    expect(screen.queryByLabelText('Create projects')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Analysts' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Read-only org members' },
    });
    fireEvent.click(screen.getByLabelText('Read members'));
    fireEvent.click(screen.getByLabelText('Read permission groups'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Permission Group' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'Analysts',
        description: 'Read-only org members',
        permission_keys: ['organization.members.read', 'organization.permission_groups.read'],
      });
    });
  });
});
