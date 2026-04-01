import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainProjectFocus } from './useAgchainProjectFocus';

const fetchAgchainOrganizationsMock = vi.fn();
const fetchAgchainProjectsMock = vi.fn();

vi.mock('@/lib/agchainWorkspaces', () => ({
  fetchAgchainOrganizations: (...args: unknown[]) => fetchAgchainOrganizationsMock(...args),
  fetchAgchainProjects: (...args: unknown[]) => fetchAgchainProjectsMock(...args),
}));

describe('useAgchainProjectFocus', () => {
  beforeEach(() => {
    fetchAgchainOrganizationsMock.mockReset();
    fetchAgchainProjectsMock.mockReset();
    window.localStorage.clear();
    fetchAgchainOrganizationsMock.mockResolvedValue({
      items: [
        {
          organization_id: 'org-1',
          organization_slug: 'personal-user-1',
          display_name: 'Personal Workspace',
          membership_role: 'organization_admin',
          is_personal: true,
          project_count: 2,
        },
      ],
    });
    fetchAgchainProjectsMock.mockResolvedValue({
      items: [
        {
          project_id: 'project-1',
          organization_id: 'org-1',
          project_slug: 'legal-evals',
          project_name: 'Legal Evals',
          description: 'Legal benchmark package',
          membership_role: 'project_admin',
          updated_at: '2026-03-27T08:15:00Z',
          primary_benchmark_slug: 'legal-10',
          primary_benchmark_name: 'Legal-10',
        },
        {
          project_id: 'project-2',
          organization_id: 'org-1',
          project_slug: 'finance-workspace',
          project_name: 'Finance Workspace',
          description: 'Finance evaluation package',
          membership_role: 'project_admin',
          updated_at: '2026-03-28T08:15:00Z',
          primary_benchmark_slug: 'finance-eval',
          primary_benchmark_name: 'Finance Eval',
        },
      ],
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('resolves persisted AGChain project focus from the stored project id', async () => {
    window.localStorage.setItem('agchain.organizationFocusId', 'org-1');
    window.localStorage.setItem('agchain.projectFocusId', 'project-2');

    const { result } = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(result.current.focusedProject?.project_name).toBe('Finance Workspace');
    });
    expect(result.current.focusedProjectSlug).toBe('finance-workspace');
  });

  it('falls back to the first available project row when no stored focus exists', async () => {
    const { result } = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('legal-evals');
    });

    expect(result.current.focusedProject?.project_name).toBe('Legal Evals');
  });

  it('accepts a legacy benchmark slug and resolves it to the owning project row', async () => {
    window.localStorage.setItem('agchain.projectFocusSlug', 'finance-eval');

    const { result } = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('finance-workspace');
    });

    expect(window.localStorage.getItem('agchain.projectFocusId')).toBe('project-2');
    expect(result.current.focusedProject?.project_name).toBe('Finance Workspace');
  });

  it('hydrates the stored AGChain focus immediately before the project list finishes loading', () => {
    window.localStorage.setItem('agchain.projectFocusSlug', 'finance-eval');
    fetchAgchainProjectsMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAgchainProjectFocus());

    expect(result.current.focusedProjectSlug).toBe('finance-eval');
    expect(result.current.loading).toBe(true);
  });

  it('synchronizes focus changes across mounted hook instances', async () => {
    const first = renderHook(() => useAgchainProjectFocus());
    const second = renderHook(() => useAgchainProjectFocus());

    await waitFor(() => {
      expect(first.result.current.focusedProjectSlug).toBe('legal-evals');
      expect(second.result.current.focusedProjectSlug).toBe('legal-evals');
    });

    act(() => {
      first.result.current.setFocusedProjectSlug('finance-eval');
    });

    await waitFor(() => {
      expect(second.result.current.focusedProjectSlug).toBe('finance-workspace');
    });
  });
});
