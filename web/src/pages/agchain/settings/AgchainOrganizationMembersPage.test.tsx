import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainOrganizationMembersPage from './AgchainOrganizationMembersPage';

const useAgchainOrganizationMembersMock = vi.fn();
const useAgchainOrganizationScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainOrganizationMembers', () => ({
  useAgchainOrganizationMembers: () => useAgchainOrganizationMembersMock(),
}));

vi.mock('@/hooks/agchain/useAgchainOrganizationScopeState', () => ({
  useAgchainOrganizationScopeState: () => useAgchainOrganizationScopeStateMock(),
}));

// Ark UI Select relies on DOM APIs not available in JSDOM
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

afterEach(() => {
  cleanup();
});

describe('AgchainOrganizationMembersPage', () => {
  const setSearchMock = vi.fn();
  const setStatusFilterMock = vi.fn();
  const inviteMembersMock = vi.fn();
  const updateMembershipStatusMock = vi.fn();

  beforeEach(() => {
    setSearchMock.mockReset();
    setStatusFilterMock.mockReset();
    inviteMembersMock.mockReset();
    updateMembershipStatusMock.mockReset();
    useAgchainOrganizationMembersMock.mockReset();
    useAgchainOrganizationScopeStateMock.mockReset();

    inviteMembersMock.mockResolvedValue(undefined);
    updateMembershipStatusMock.mockResolvedValue(undefined);

    useAgchainOrganizationScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      reload: vi.fn(),
    });

    useAgchainOrganizationMembersMock.mockReturnValue({
      organization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
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
          group_count: 2,
          groups: [
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
          ],
        },
        {
          organization_member_id: 'member-2',
          user_id: 'user-2',
          email: 'member@example.com',
          display_name: 'Member Person',
          membership_role: 'organization_member',
          membership_status: 'disabled',
          created_at: '2026-04-02T10:00:00Z',
          group_count: 1,
          groups: [
            {
              permission_group_id: 'group-analysts',
              name: 'Analysts',
              is_system_group: false,
              system_group_kind: null,
            },
          ],
        },
      ],
      permissionGroups: [
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
      ],
      search: '',
      statusFilter: 'all',
      loading: false,
      error: null,
      inviteError: null,
      inviteResults: [],
      creatingInvite: false,
      updatingMemberId: null,
      setSearch: setSearchMock,
      setStatusFilter: setStatusFilterMock,
      inviteMembers: inviteMembersMock,
      updateMembershipStatus: updateMembershipStatusMock,
      reload: vi.fn(),
    });
  });

  it('renders the corrected members surface and opens the invite modal', async () => {
    render(
      <MemoryRouter>
        <AgchainOrganizationMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-standard-surface')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Organization Members' })).toBeInTheDocument();
    expect(screen.getByText('Current organization: AGChain')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /find members/i })).toBeInTheDocument();
    expect(screen.getByText('Owner Person')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Organization Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Owners').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Analysts').length).toBeGreaterThan(0);
    expect(screen.getByText('Member Person')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Invite Organization Members' })).toBeInTheDocument();
    });
  });

  it('forwards toolbar search, status filter, and membership actions to the members hook', async () => {
    render(
      <MemoryRouter>
        <AgchainOrganizationMembersPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: /find members/i }), {
      target: { value: 'owner' },
    });
    expect(setSearchMock).toHaveBeenCalledWith('owner');

    // Ark Select: click the combobox trigger, then click the desired option
    fireEvent.click(screen.getByRole('combobox', { name: /show members by status/i }));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Disabled' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Disabled' }));
    await waitFor(() => {
      expect(setStatusFilterMock).toHaveBeenCalledWith('disabled');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Disable member' }));
    await waitFor(() => {
      expect(updateMembershipStatusMock).toHaveBeenCalledWith('member-1', 'disabled');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate member' }));
    await waitFor(() => {
      expect(updateMembershipStatusMock).toHaveBeenCalledWith('member-2', 'active');
    });
  });

  it('renders the no-organization state from the shared scope hook', () => {
    useAgchainOrganizationScopeStateMock.mockReturnValue({
      kind: 'no-organization',
    });

    render(
      <MemoryRouter>
        <AgchainOrganizationMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'No organization' })).toBeInTheDocument();
    expect(
      screen.getByText(/select or create an organization to continue into agchain settings/i),
    ).toBeInTheDocument();
  });
});
