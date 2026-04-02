import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AgchainWorkspaceProvider } from '@/contexts/AgchainWorkspaceContext';
import { useAgchainProjectFocus } from './useAgchainProjectFocus';

const fetchAgchainOrganizationsMock = vi.fn();
const fetchAgchainProjectsMock = vi.fn();

vi.mock('@/lib/agchainWorkspaces', () => ({
  fetchAgchainOrganizations: (...args: unknown[]) => fetchAgchainOrganizationsMock(...args),
  fetchAgchainProjects: (...args: unknown[]) => fetchAgchainProjectsMock(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AgchainWorkspaceProvider>{children}</AgchainWorkspaceProvider>;
}

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

    const { result } = renderHook(() => useAgchainProjectFocus(), { wrapper });

    await waitFor(() => {
      expect(result.current.focusedProject?.project_name).toBe('Finance Workspace');
    });
    expect(result.current.focusedProjectSlug).toBe('finance-workspace');
  });

  it('falls back to the first available project row when no stored focus exists', async () => {
    const { result } = renderHook(() => useAgchainProjectFocus(), { wrapper });

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('legal-evals');
    });

    expect(result.current.focusedProject?.project_name).toBe('Legal Evals');
  });

  it('accepts a legacy benchmark slug and resolves it to the owning project row', async () => {
    window.localStorage.setItem('agchain.projectFocusSlug', 'finance-eval');

    const { result } = renderHook(() => useAgchainProjectFocus(), { wrapper });

    await waitFor(() => {
      expect(result.current.focusedProjectSlug).toBe('finance-workspace');
    });

    expect(window.localStorage.getItem('agchain.projectFocusId')).toBe('project-2');
    expect(result.current.focusedProject?.project_name).toBe('Finance Workspace');
  });

  it('reports bootstrapping status before the project list finishes loading', () => {
    fetchAgchainProjectsMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAgchainProjectFocus(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.status).toBe('bootstrapping');
    expect(result.current.focusedProject).toBeNull();
  });

  it('clears a stale legacy slug after loading finishes without a matching project', async () => {
    window.localStorage.setItem('agchain.projectFocusSlug', 'finance-eval');
    fetchAgchainProjectsMock.mockResolvedValue({
      items: [],
    });

    const { result } = renderHook(() => useAgchainProjectFocus(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.focusedProject).toBeNull();
    expect(result.current.focusedProjectSlug).toBeNull();
    expect(result.current.status).toBe('no-project');
  });

  it('exposes items as AgchainFocusedProjectRow with benchmark_slug and href', async () => {
    const { result } = renderHook(() => useAgchainProjectFocus(), { wrapper });

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    const first = result.current.items[0];
    expect(first.benchmark_slug).toBe('legal-10');
    expect(first.benchmark_name).toBe('Legal-10');
    expect(first.href).toContain('/app/agchain/overview?project=legal-evals');
  });
});
