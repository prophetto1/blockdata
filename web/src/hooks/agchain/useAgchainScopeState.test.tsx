import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainScopeState } from './useAgchainScopeState';

const useAgchainProjectFocusMock = vi.fn();
const useAgchainWorkspaceContextMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

vi.mock('@/hooks/agchain/useAgchainWorkspaceContext', () => ({
  useAgchainWorkspaceContext: () => useAgchainWorkspaceContextMock(),
}));

function mockWorkspaceState({
  status,
  error = null,
  selectedOrganization = null,
  focusedProject = null,
  reload = vi.fn(),
}: {
  status: 'bootstrapping' | 'error' | 'no-organization' | 'no-project' | 'ready';
  error?: string | null;
  selectedOrganization?: { organization_id: string; display_name: string } | null;
  focusedProject?: { project_id: string; project_name: string; benchmark_name: string } | null;
  reload?: ReturnType<typeof vi.fn>;
}) {
  useAgchainProjectFocusMock.mockReturnValue({
    status,
    error,
    focusedProject,
    reload,
  });

  useAgchainWorkspaceContextMock.mockReturnValue({
    selectedOrganization,
  });

  return { reload };
}

describe('useAgchainScopeState', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainWorkspaceContextMock.mockReset();
  });

  it('returns bootstrapping while the workspace is still loading', () => {
    mockWorkspaceState({ status: 'bootstrapping' });

    const { result } = renderHook(() => useAgchainScopeState('none'));

    expect(result.current).toEqual({ kind: 'bootstrapping' });
  });

  it('returns error with a reload callback when the workspace failed to load', () => {
    const { reload } = mockWorkspaceState({
      status: 'error',
      error: 'Failed to load workspace.',
    });

    const { result } = renderHook(() => useAgchainScopeState('organization'));

    expect(result.current.kind).toBe('error');
    if (result.current.kind !== 'error') {
      throw new Error('expected error scope state');
    }
    expect(result.current.reload).toBe(reload);
  });

  it('returns no-organization when no organization is selected', () => {
    mockWorkspaceState({ status: 'no-organization' });

    const { result } = renderHook(() => useAgchainScopeState('organization'));

    expect(result.current).toEqual({ kind: 'no-organization' });
  });

  it('returns no-project with a guaranteed selected organization', () => {
    const selectedOrganization = {
      organization_id: 'org-1',
      display_name: 'AGChain',
    };
    mockWorkspaceState({
      status: 'no-project',
      selectedOrganization,
    });

    const { result } = renderHook(() => useAgchainScopeState('project'));

    expect(result.current.kind).toBe('no-project');
    if (result.current.kind !== 'no-project') {
      throw new Error('expected no-project scope state');
    }
    expect(result.current.selectedOrganization).toEqual(selectedOrganization);
  });

  it('returns ready with guaranteed organization and project when project scope is satisfied', () => {
    const selectedOrganization = {
      organization_id: 'org-1',
      display_name: 'AGChain',
    };
    const focusedProject = {
      project_id: 'project-1',
      project_name: 'Benchmark registry',
      benchmark_name: 'Benchmark registry',
    };
    mockWorkspaceState({
      status: 'ready',
      selectedOrganization,
      focusedProject,
    });

    const { result } = renderHook(() => useAgchainScopeState('project'));

    expect(result.current.kind).toBe('ready');
    if (result.current.kind !== 'ready') {
      throw new Error('expected ready scope state');
    }
    expect(result.current.selectedOrganization).toEqual(selectedOrganization);
    expect(result.current.focusedProject).toEqual(focusedProject);
  });
});
