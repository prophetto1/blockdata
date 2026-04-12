import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const platformApiFetchMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

async function importAccessHooks() {
  return import('./useAdminSurfaceAccess');
}

describe('useAdminSurfaceAccess', () => {
  beforeEach(() => {
    vi.resetModules();
    platformApiFetchMock.mockReset();
    useAuthMock.mockReset();
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('waits for auth bootstrap before probing access', async () => {
    const authState = {
      loading: true,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result, rerender } = renderHook(() => useAdminSurfaceAccessState());

    expect(result.current.status).toBe('loading');
    expect(platformApiFetchMock).not.toHaveBeenCalled();

    authState.loading = false;
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: true,
      }),
    });

    rerender();

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: false,
          superuser: true,
        },
      });
    });
  });

  it('shares a single access probe across multiple consumers in the same session', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: false,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();

    function Probe({ label }: { label: string }) {
      const state = useAdminSurfaceAccessState();
      return (
        <div data-testid={label}>
          {state.status}:{state.access?.blockdataAdmin ? 'yes' : 'no'}
        </div>
      );
    }

    render(
      <>
        <Probe label="selector" />
        <Probe label="guard" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selector')).toHaveTextContent('ready:yes');
      expect(screen.getByTestId('guard')).toHaveTextContent('ready:yes');
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one access probe across the real workspace selector and blockdata guard', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: false,
      }),
    });

    const [{ ShellWorkspaceSelector }, { BlockdataAdminGuard }] = await Promise.all([
      import('@/components/shell/ShellWorkspaceSelector'),
      import('@/pages/superuser/SuperuserGuard'),
    ]);

    render(
      <MemoryRouter initialEntries={['/app/blockdata-admin/parsers-docling']}>
        <ShellWorkspaceSelector />
        <Routes>
          <Route path="/app" element={<div data-testid="app-home">app home</div>} />
          <Route path="/app/blockdata-admin/*" element={<BlockdataAdminGuard />}>
            <Route path="*" element={<div data-testid="protected-surface">protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-surface')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata Admin');
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses resolved access after a consumer remount instead of probing again', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: false,
        agchain_admin: true,
        superuser: false,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();

    function Probe({ label }: { label: string }) {
      const state = useAdminSurfaceAccessState();
      return (
        <div data-testid={label}>
          {state.status}:{state.access?.agchainAdmin ? 'yes' : 'no'}
        </div>
      );
    }

    const { rerender } = render(<Probe label="selector" />);

    await waitFor(() => {
      expect(screen.getByTestId('selector')).toHaveTextContent('ready:yes');
    });

    rerender(<Probe label="guard" />);

    expect(screen.getByTestId('guard')).toHaveTextContent('ready:yes');
    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('settles into an error state instead of staying null forever when the probe fails', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockRejectedValueOnce(new Error('network down'));

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result } = renderHook(() => useAdminSurfaceAccessState());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.access).toBeNull();
    expect(result.current.error).toContain('network down');
  });

  it('refreshes access when the authenticated session token changes without dropping the last ready access', async () => {
    let authState = {
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: false,
        agchain_admin: false,
        superuser: true,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result, rerender } = renderHook(() => useAdminSurfaceAccessState());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: false,
          agchainAdmin: false,
          superuser: true,
        },
      });
    });

    authState = {
      ...authState,
      session: { access_token: 'token-2' },
    };
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: true,
        superuser: false,
      }),
    });

    rerender();

    expect(result.current).toMatchObject({
      status: 'ready',
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: true,
          superuser: false,
        },
      });
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the last known access when a token-refresh probe fails', async () => {
    let authState = {
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: false,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result, rerender } = renderHook(() => useAdminSurfaceAccessState());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: false,
          superuser: false,
        },
      });
    });

    authState = {
      ...authState,
      session: { access_token: 'token-2' },
    };
    platformApiFetchMock.mockRejectedValueOnce(new Error('refresh failed'));

    rerender();

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: false,
          superuser: false,
        },
      });
      expect(result.current.error).toContain('refresh failed');
    });
  });
});
