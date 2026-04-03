import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InviteOrganizationMembersModal } from './InviteOrganizationMembersModal';

afterEach(() => {
  cleanup();
});

describe('InviteOrganizationMembersModal', () => {
  it('collects one or more emails and selected permission groups before creating invites', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);

    render(
      <InviteOrganizationMembersModal
        open
        onOpenChange={vi.fn()}
        creating={false}
        error={null}
        results={[]}
        permissionGroups={[
          {
            permission_group_id: 'group-owners',
            name: 'Owners',
            is_system_group: true,
            system_group_kind: 'owners',
          },
          {
            permission_group_id: 'group-analysts',
            name: 'Analysts',
            is_system_group: false,
            system_group_kind: null,
          },
        ]}
        onInvite={onInvite}
      />,
    );

    expect(screen.getByText(/pending invite records were created in agchain/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email addresses/i), {
      target: {
        value: 'owner@example.com\nanalyst@example.com',
      },
    });
    fireEvent.click(screen.getByLabelText('Owners'));
    fireEvent.click(screen.getByLabelText('Analysts'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Invites' }));

    await waitFor(() => {
      expect(onInvite).toHaveBeenCalledWith({
        emails: ['owner@example.com', 'analyst@example.com'],
        permission_group_ids: ['group-owners', 'group-analysts'],
      });
    });
  });

  it('renders batch invite outcomes from the backend without implying delivery', () => {
    render(
      <InviteOrganizationMembersModal
        open
        onOpenChange={vi.fn()}
        creating={false}
        error={null}
        results={[
          {
            email: 'owner@example.com',
            outcome: 'invite_created',
            invite_id: 'invite-1',
            invite_status: 'pending',
            expires_at: '2026-04-09T10:00:00Z',
            permission_group_ids: ['group-owners'],
            error_code: null,
          },
          {
            email: 'member@example.com',
            outcome: 'already_pending',
            invite_id: 'invite-2',
            invite_status: 'pending',
            expires_at: '2026-04-09T10:00:00Z',
            permission_group_ids: ['group-analysts'],
            error_code: null,
          },
          {
            email: 'bad-email',
            outcome: 'invalid_email',
            invite_id: null,
            invite_status: null,
            expires_at: null,
            permission_group_ids: [],
            error_code: 'invalid_email',
          },
        ]}
        permissionGroups={[
          {
            permission_group_id: 'group-owners',
            name: 'Owners',
            is_system_group: true,
            system_group_kind: 'owners',
          },
        ]}
        onInvite={vi.fn()}
      />,
    );

    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText(/invite created/i)).toBeInTheDocument();
    expect(screen.getByText(/already pending/i)).toBeInTheDocument();
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    expect(screen.getByText(/pending invite records were created in agchain/i)).toBeInTheDocument();
  });
});
