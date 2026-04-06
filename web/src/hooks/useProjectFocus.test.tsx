import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/app']}>{children}</MemoryRouter>;
}

const PROJECT_ROWS = [
  {
    project_id: 'project-1',
    project_name: 'Alpha Project',
    doc_count: 11,
    workspace_id: null,
  },
  {
    project_id: 'project-2',
    project_name: 'Beta Project',
    doc_count: 4,
    workspace_id: 'workspace-2',
  },
];

describe('useProjectFocus', () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
    window.localStorage.clear();
    rpcMock.mockReset();
    fromMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
      profile: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resendSignupConfirmation: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    });
    rpcMock.mockResolvedValue({
      data: PROJECT_ROWS,
      error: null,
    });
    fromMock.mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('reuses the verified Blockdata project list after a remount in the same session', async () => {
    const { useProjectFocus } = await import('./useProjectFocus');
    const firstRender = renderHook(() => useProjectFocus(), { wrapper });

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false);
    });

    expect(firstRender.result.current.projectOptions).toHaveLength(2);
    expect(firstRender.result.current.resolvedProjectName).toBe('Alpha Project');
    expect(rpcMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    const secondRender = renderHook(() => useProjectFocus(), { wrapper });

    expect(secondRender.result.current.loading).toBe(false);
    expect(secondRender.result.current.projectOptions).toHaveLength(2);
    expect(secondRender.result.current.resolvedProjectName).toBe('Alpha Project');
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});
