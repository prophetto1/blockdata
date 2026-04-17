import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainOrganizationMembers } from './useAgchainOrganizationMembers';

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

const fetchOrganizationMembersMock = vi.fn();
const createOrganizationMemberInvitationsMock = vi.fn();
const updateOrganizationMembershipStatusMock = vi.fn();

vi.mock('@/lib/agchainSettings', () => ({
  fetchOrganizationMembers: (...args: unknown[]) => fetchOrganizationMembersMock(...args),
  createOrganizationMemberInvitations: (...args: unknown[]) => createOrganizationMemberInvitationsMock(...args),
  updateOrganizationMembershipStatus: (...args: unknown[]) => updateOrganizationMembershipStatusMock(...args),
}));

describe('useAgchainOrganizationMembers', () => {
  beforeEach(() => {
    fetchOrganizationMembersMock.mockReset();
    createOrganizationMemberInvitationsMock.mockReset();
    updateOrganizationMembershipStatusMock.mockReset();
  });

  it('ignores a stale old-organization failure after the selected organization changes', async () => {
    const org1Request = createDeferred<{
      organization: { organization_id: string; display_name: string };
      items: [];
    }>();
    const org2Request = createDeferred<{
      organization: { organization_id: string; display_name: string };
      items: [];
    }>();

    fetchOrganizationMembersMock.mockImplementation((organizationId: string) => {
      if (organizationId === 'org-1') {
        return org1Request.promise;
      }
      if (organizationId === 'org-2') {
        return org2Request.promise;
      }
      throw new Error(`Unexpected organization ${organizationId}`);
    });

    let selectedOrganizationId: string | null = 'org-1';
    const { result, rerender } = renderHook(
      ({ organizationId }) => useAgchainOrganizationMembers(organizationId),
      {
        initialProps: {
          organizationId: selectedOrganizationId,
        },
      },
    );

    await waitFor(() => {
      expect(fetchOrganizationMembersMock).toHaveBeenCalledWith('org-1', {
        search: '',
        status: 'all',
      });
    });

    selectedOrganizationId = 'org-2';
    rerender({ organizationId: selectedOrganizationId });

    await waitFor(() => {
      expect(fetchOrganizationMembersMock).toHaveBeenCalledWith('org-2', {
        search: '',
        status: 'all',
      });
    });

    org2Request.resolve({
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

    org1Request.reject(new Error('Organization not found'));

    await waitFor(() => {
      expect(result.current.organization?.organization_id).toBe('org-2');
    });

    expect(result.current.error).toBeNull();
  });
});
