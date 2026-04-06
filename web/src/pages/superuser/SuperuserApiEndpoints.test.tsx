import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platformApiFetchMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

async function importPage() {
  return import('./SuperuserApiEndpoints');
}

describe('SuperuserApiEndpoints', () => {
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
    if (typeof window !== 'undefined') {
      window.ResizeObserver = globalThis.ResizeObserver;
    }
    if (typeof globalThis.IntersectionObserver === 'undefined') {
      globalThis.IntersectionObserver = class {
        disconnect() {}
        observe() {}
        takeRecords() { return []; }
        unobserve() {}
      } as unknown as typeof IntersectionObserver;
    }
    if (typeof window !== 'undefined') {
      window.IntersectionObserver = globalThis.IntersectionObserver;
    }
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('reuses the verified endpoint catalog after a remount in the same session', async () => {
    const spec = {
      paths: {
        '/health': {
          get: {
            tags: ['system'],
            summary: 'Health probe',
            security: [],
          },
        },
        '/{function_name}': {
          post: {
            security: [{ HTTPBearer: [] }],
          },
        },
      },
    };
    const functions = [
      {
        function_name: 'catalog.refresh',
        path: '/catalog/refresh',
        method: 'post',
        task_type: 'plugins.catalog.refresh',
      },
    ];

    platformApiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => spec,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => functions,
      });

    const { Component } = await importPage();
    const firstRender = render(<Component />);

    expect(await screen.findByText('/health', undefined, { timeout: 2_000 })).toBeInTheDocument();

    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);

    firstRender.unmount();

    render(<Component />);

    expect(screen.queryByText('Loading API endpoints...')).not.toBeInTheDocument();
    expect(screen.getByText('/health')).toBeInTheDocument();
    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);
});
