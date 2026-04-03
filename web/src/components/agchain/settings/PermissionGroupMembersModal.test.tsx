import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionGroupMembersModal } from './PermissionGroupMembersModal';

afterEach(() => {
  cleanup();
});

describe('PermissionGroupMembersModal', () => {
  it('supports searchable add and remove member flows', async () => {
    const onSearchChange = vi.fn();
    const onAddMembers = vi.fn().mockResolvedValue(undefined);
    const onRemoveMember = vi.fn().mockResolvedValue(undefined);

    render(
      <PermissionGroupMembersModal
        open
        onOpenChange={vi.fn()}
        loading={false}
        adding={false}
        removingMemberId={null}
        error={null}
        search="owner"
        onSearchChange={onSearchChange}
        membersData={{
          group: {
            permission_group_id: 'group-owners',
            name: 'Owners',
            is_system_group: true,
          },
          items: [
            {
              organization_member_id: 'member-1',
              user_id: 'user-1',
              email: 'owner@example.com',
              display_name: 'Owner Person',
              membership_role: 'organization_admin',
              membership_status: 'active',
              created_at: '2026-04-02T10:00:00Z',
            },
          ],
        }}
        availableMembers={[
          {
            organization_member_id: 'member-2',
            organization_id: 'org-1',
            user_id: 'user-2',
            email: 'member@example.com',
            display_name: 'Member Person',
            membership_role: 'organization_member',
            membership_status: 'active',
            created_at: '2026-04-02T10:00:00Z',
            group_count: 0,
            groups: [],
          },
        ]}
        onAddMembers={onAddMembers}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: /search members/i }), {
      target: { value: 'member' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('member');

    // Ark Checkbox: click the hidden input and wait for the state machine to process
    const checkboxInputs = screen.getAllByRole('checkbox', { hidden: true });
    fireEvent.click(checkboxInputs[0]); // Select Member Person
    await waitFor(() => {
      expect(checkboxInputs[0].closest('[data-scope="checkbox"]')?.getAttribute('data-state')).toBe('checked');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Selected Members' }));

    await waitFor(() => {
      expect(onAddMembers).toHaveBeenCalledWith(['member-2']);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Owner Person' }));
    await waitFor(() => {
      expect(onRemoveMember).toHaveBeenCalledWith('member-1');
    });
  });

  it('surfaces last-owner protection feedback from the backend cleanly', () => {
    render(
      <PermissionGroupMembersModal
        open
        onOpenChange={vi.fn()}
        loading={false}
        adding={false}
        removingMemberId={null}
        error="At least one owner must remain active"
        search=""
        onSearchChange={vi.fn()}
        membersData={{
          group: {
            permission_group_id: 'group-owners',
            name: 'Owners',
            is_system_group: true,
          },
          items: [
            {
              organization_member_id: 'member-1',
              user_id: 'user-1',
              email: 'owner@example.com',
              display_name: 'Owner Person',
              membership_role: 'organization_admin',
              membership_status: 'active',
              created_at: '2026-04-02T10:00:00Z',
            },
          ],
        }}
        availableMembers={[]}
        onAddMembers={vi.fn()}
        onRemoveMember={vi.fn()}
      />,
    );

    expect(screen.getByText('At least one owner must remain active')).toBeInTheDocument();
  });
});
