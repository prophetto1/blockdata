import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainPermissionGroups } from './useAgchainPermissionGroups';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const fetchPermissionDefinitionsMock = vi.fn();
const fetchPermissionGroupsMock = vi.fn();
const fetchPermissionGroupDetailMock = vi.fn();
const fetchPermissionGroupMembersMock = vi.fn();
const fetchOrganizationMembersMock = vi.fn();
const createOrganizationPermissionGroupMock = vi.fn();
const addPermissionGroupMembersMock = vi.fn();
const removePermissionGroupMemberMock = vi.fn();

vi.mock('@/lib/agchainSettings', () => ({
  fetchPermissionDefinitions: (...args: unknown[]) => fetchPermissionDefinitionsMock(...args),
  fetchPermissionGroups: (...args: unknown[]) => fetchPermissionGroupsMock(...args),
  fetchPermissionGroupDetail: (...args: unknown[]) => fetchPermissionGroupDetailMock(...args),
  fetchPermissionGroupMembers: (...args: unknown[]) => fetchPermissionGroupMembersMock(...args),
  fetchOrganizationMembers: (...args: unknown[]) => fetchOrganizationMembersMock(...args),
  createOrganizationPermissionGroup: (...args: unknown[]) => createOrganizationPermissionGroupMock(...args),
  addPermissionGroupMembers: (...args: unknown[]) => addPermissionGroupMembersMock(...args),
  removePermissionGroupMember: (...args: unknown[]) => removePermissionGroupMemberMock(...args),
}));

describe('useAgchainPermissionGroups', () => {
  beforeEach(() => {
    fetchPermissionDefinitionsMock.mockReset();
    fetchPermissionGroupsMock.mockReset();
    fetchPermissionGroupDetailMock.mockReset();
    fetchPermissionGroupMembersMock.mockReset();
    fetchOrganizationMembersMock.mockReset();
    createOrganizationPermissionGroupMock.mockReset();
    addPermissionGroupMembersMock.mockReset();
    removePermissionGroupMemberMock.mockReset();
  });

  it('ignores a stale old-organization failure after the selected organization changes', async () => {
    const org1Definitions = createDeferred<{ organization_permissions: []; project_permissions: []; protected_system_groups: [] }>();
    const org1Groups = createDeferred<{ organization: { organization_id: string; display_name: string }; items: [] }>();
    const org2Definitions = createDeferred<{ organization_permissions: []; project_permissions: []; protected_system_groups: [] }>();
    const org2Groups = createDeferred<{ organization: { organization_id: string; display_name: string }; items: [] }>();

    fetchPermissionDefinitionsMock.mockImplementation((organizationId: string) => {
      if (organizationId === 'org-1') return org1Definitions.promise;
      if (organizationId === 'org-2') return org2Definitions.promise;
      throw new Error(`Unexpected organization ${organizationId}`);
    });
    fetchPermissionGroupsMock.mockImplementation((organizationId: string) => {
      if (organizationId === 'org-1') return org1Groups.promise;
      if (organizationId === 'org-2') return org2Groups.promise;
      throw new Error(`Unexpected organization ${organizationId}`);
    });

    let selectedOrganizationId: string | null = 'org-1';
    const { result, rerender } = renderHook(
      ({ organizationId }) => useAgchainPermissionGroups(organizationId),
      {
        initialProps: {
          organizationId: selectedOrganizationId,
        },
      },
    );

    await waitFor(() => {
      expect(fetchPermissionDefinitionsMock).toHaveBeenCalledWith('org-1');
      expect(fetchPermissionGroupsMock).toHaveBeenCalledWith('org-1', { search: '' });
    });

    selectedOrganizationId = 'org-2';
    rerender({ organizationId: selectedOrganizationId });

    await waitFor(() => {
      expect(fetchPermissionDefinitionsMock).toHaveBeenCalledWith('org-2');
      expect(fetchPermissionGroupsMock).toHaveBeenCalledWith('org-2', { search: '' });
    });

    org2Definitions.resolve({
      organization_permissions: [],
      project_permissions: [],
      protected_system_groups: [],
    });
    org2Groups.resolve({
      organization: {
        organization_id: 'org-2',
        display_name: 'Org Two',
      },
      items: [],
    });

    await waitFor(() => {
      expect(result.current.organization?.organization_id).toBe('org-2');
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    org1Definitions.reject(new Error('Organization not found'));
    org1Groups.resolve({
      organization: {
        organization_id: 'org-1',
        display_name: 'Org One',
      },
      items: [],
    });

    await waitFor(() => {
      expect(result.current.organization?.organization_id).toBe('org-2');
    });

    expect(result.current.error).toBeNull();
  });
});
