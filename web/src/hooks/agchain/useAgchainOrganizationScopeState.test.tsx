import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainOrganizationScopeState } from './useAgchainOrganizationScopeState';

const fetchAgchainOrganizationsMock = vi.fn();
const readStoredAgchainOrganizationFocusIdMock = vi.fn();
const writeStoredAgchainWorkspaceFocusMock = vi.fn();

vi.mock('@/lib/agchainWorkspaces', () => ({
  fetchAgchainOrganizations: (...args: unknown[]) => fetchAgchainOrganizationsMock(...args),
}));

vi.mock('@/lib/agchainProjectFocus', () => ({
  readStoredAgchainOrganizationFocusId: () => readStoredAgchainOrganizationFocusIdMock(),
  writeStoredAgchainWorkspaceFocus: (...args: unknown[]) => writeStoredAgchainWorkspaceFocusMock(...args),
}));

describe('useAgchainOrganizationScopeState', () => {
  beforeEach(() => {
    fetchAgchainOrganizationsMock.mockReset();
    readStoredAgchainOrganizationFocusIdMock.mockReset();
    writeStoredAgchainWorkspaceFocusMock.mockReset();
    readStoredAgchainOrganizationFocusIdMock.mockReturnValue(null);
  });

  it('resolves organization scope without waiting on project bootstrap and prefers stored organization focus', async () => {
    readStoredAgchainOrganizationFocusIdMock.mockReturnValue('org-2');
    fetchAgchainOrganizationsMock.mockResolvedValue({
      items: [
        {
          organization_id: 'org-1',
          organization_slug: 'org-1',
          display_name: 'Org One',
          membership_role: 'organization_admin',
          is_personal: false,
          project_count: 3,
        },
        {
          organization_id: 'org-2',
          organization_slug: 'org-2',
          display_name: 'Org Two',
          membership_role: 'organization_admin',
          is_personal: false,
          project_count: 1,
        },
      ],
    });

    const { result } = renderHook(() => useAgchainOrganizationScopeState());

    expect(result.current.kind).toBe('bootstrapping');

    await waitFor(() => {
      expect(result.current.kind).toBe('ready');
    });

    if (result.current.kind !== 'ready') {
      throw new Error('expected ready organization scope');
    }

    expect(fetchAgchainOrganizationsMock).toHaveBeenCalledTimes(1);
    expect(result.current.selectedOrganization.organization_id).toBe('org-2');
    expect(writeStoredAgchainWorkspaceFocusMock).toHaveBeenCalledWith({
      focusedOrganizationId: 'org-2',
    });
  });
});
