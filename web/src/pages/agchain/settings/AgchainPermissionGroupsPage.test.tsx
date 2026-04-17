import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainPermissionGroupsPage from './AgchainPermissionGroupsPage';

const useAgchainPermissionGroupsMock = vi.fn();
const useAgchainOrganizationScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainPermissionGroups', () => ({
  useAgchainPermissionGroups: () => useAgchainPermissionGroupsMock(),
}));

vi.mock('@/hooks/agchain/useAgchainOrganizationScopeState', () => ({
  useAgchainOrganizationScopeState: () => useAgchainOrganizationScopeStateMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainPermissionGroupsPage', () => {
  const setSearchMock = vi.fn();
  const createPermissionGroupMock = vi.fn();
  const loadPermissionGroupDetailMock = vi.fn();
  const loadPermissionGroupMembersMock = vi.fn();
  const addGroupMembersMock = vi.fn();
  const removeGroupMemberMock = vi.fn();

  beforeEach(() => {
    setSearchMock.mockReset();
    createPermissionGroupMock.mockReset();
    loadPermissionGroupDetailMock.mockReset();
    loadPermissionGroupMembersMock.mockReset();
    addGroupMembersMock.mockReset();
    removeGroupMemberMock.mockReset();
    useAgchainPermissionGroupsMock.mockReset();
    useAgchainOrganizationScopeStateMock.mockReset();

    createPermissionGroupMock.mockResolvedValue(undefined);
    loadPermissionGroupDetailMock.mockResolvedValue(undefined);
    loadPermissionGroupMembersMock.mockResolvedValue(undefined);
    addGroupMembersMock.mockResolvedValue(undefined);
    removeGroupMemberMock.mockResolvedValue(undefined);

    useAgchainOrganizationScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      reload: vi.fn(),
    });

    useAgchainPermissionGroupsMock.mockReturnValue({
      organization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      items: [
        {
          permission_group_id: 'group-owners',
          organization_id: 'org-1',
          name: 'Owners',
          group_slug: 'owners',
          description: 'System owners',
          is_system_group: true,
          system_group_kind: 'owners',
          member_count: 1,
          organization_permission_count: 2,
          project_permission_count: 1,
          created_at: '2026-04-02T00:00:00Z',
          updated_at: '2026-04-02T00:00:00Z',
        },
        {
          permission_group_id: 'group-analysts',
          organization_id: 'org-1',
          name: 'Analysts',
          group_slug: 'analysts',
          description: 'Read-only org members',
          is_system_group: false,
          system_group_kind: null,
          member_count: 3,
          organization_permission_count: 2,
          project_permission_count: 0,
          created_at: '2026-04-02T00:00:00Z',
          updated_at: '2026-04-02T00:00:00Z',
        },
      ],
      permissionDefinitions: {
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
      },
      selectedGroupDetail: {
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
          organization: ['organization.members.read'],
          project: ['project.create'],
        },
        group_policy_notice:
          'Custom groups expose only organization-level grant editing in V1. Protected system groups may carry seeded project-level grants.',
      },
      selectedGroupMembers: {
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
      },
      availableMembers: [
        {
          organization_member_id: 'member-2',
          organization_id: 'org-1',
          user_id: 'user-2',
          email: 'member@example.com',
          display_name: 'Member Person',
          membership_role: 'organization_member',
          membership_status: 'active',
          created_at: '2026-04-02T10:00:00Z',
          group_count: 1,
          groups: [],
        },
      ],
      search: '',
      loading: false,
      error: null,
      createError: null,
      detailError: null,
      membersError: null,
      creating: false,
      detailLoading: false,
      membersLoading: false,
      addingMembers: false,
      removingMemberId: null,
      setSearch: setSearchMock,
      createPermissionGroup: createPermissionGroupMock,
      loadPermissionGroupDetail: loadPermissionGroupDetailMock,
      loadPermissionGroupMembers: loadPermissionGroupMembersMock,
      addGroupMembers: addGroupMembersMock,
      removeGroupMember: removeGroupMemberMock,
      reload: vi.fn(),
    });
  });

  it('renders the corrected permission groups surface and opens the task-3 modals', async () => {
    render(
      <MemoryRouter>
        <AgchainPermissionGroupsPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-standard-surface')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Permission Groups' })).toBeInTheDocument();
    expect(screen.getByText('Current organization: AGChain')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /find permission groups/i })).toBeInTheDocument();
    expect(screen.getAllByText('Owners').length).toBeGreaterThan(0);
    expect(screen.getByText('System group')).toBeInTheDocument();
    expect(screen.getByText('Analysts')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create permission group' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Permission Group' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View permissions for Owners' }));
    await waitFor(() => {
      expect(loadPermissionGroupDetailMock).toHaveBeenCalledWith('group-owners');
      expect(screen.getByRole('heading', { name: 'Permission Group Permissions' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Manage members for Owners' }));
    await waitFor(() => {
      expect(loadPermissionGroupMembersMock).toHaveBeenCalledWith('group-owners');
      expect(screen.getByRole('heading', { name: 'Permission Group Members' })).toBeInTheDocument();
    });
  });

  it('forwards the page search box to the permission-groups hook', () => {
    render(
      <MemoryRouter>
        <AgchainPermissionGroupsPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: /find permission groups/i }), {
      target: { value: 'owner' },
    });

    expect(setSearchMock).toHaveBeenCalledWith('owner');
  });

  it('renders the no-organization state from the shared scope hook', () => {
    useAgchainOrganizationScopeStateMock.mockReturnValue({
      kind: 'no-organization',
    });

    render(
      <MemoryRouter>
        <AgchainPermissionGroupsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'No organization' })).toBeInTheDocument();
    expect(
      screen.getByText(/select or create an organization to continue into agchain settings/i),
    ).toBeInTheDocument();
  });
});
