import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';
import routerSource from '@/router.tsx?raw';

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
  return import('./SuperuserOpenApiFastApi');
}

describe('SuperuserOpenApiFastApi', () => {
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
        takeRecords() {
          return [];
        }
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

  it('renders the API endpoint catalog on the superuser route and rewires the legacy redirect', async () => {
    const controlTowerSection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'CONTROL TOWER');
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

    expect(controlTowerSection?.items.some((item) => item.path === '/app/superuser/openapi-fastapi')).toBe(true);
    expect(routerSource).toContain("path: '/app/superuser/api-endpoints'");
    expect(routerSource).toContain('Navigate to="/app/superuser/openapi-fastapi" replace');
    expect(routerSource).toContain("path: 'openapi-fastapi'");

    const { Component } = await importPage();
    render(<Component />);

    expect(await screen.findByText('/health', undefined, { timeout: 2_000 })).toBeInTheDocument();
    expect(screen.getByText('API Endpoints')).toBeInTheDocument();
    expect(screen.queryByTestId('superuser-openapi-fastapi-placeholder')).not.toBeInTheDocument();
    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);
});
