import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import routerSource from '@/router.tsx?raw';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

async function importPage() {
  return import('./CoordinationRuntimeMock');
}

describe('CoordinationRuntimeMock', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('registers the mock coordination route under superuser', () => {
    expect(routerSource).toContain("path: 'coordination-runtime-mock'");
  });

  it('adds the mock design page to the superuser DEV ONLY rail', () => {
    const mockNavItem = SUPERUSER_NAV_SECTIONS
      .flatMap((section) => section.items)
      .find((item) => item.path === '/app/superuser/coordination-runtime-mock');

    expect(mockNavItem).toMatchObject({
      label: 'Coordination Runtime Mock',
      path: '/app/superuser/coordination-runtime-mock',
    });
  });

  it('renders the mock design scaffolds for fast visual iteration', async () => {
    const { Component } = await importPage();
    render(<Component />);

    expect(screen.queryByRole('heading', { name: /coordination runtime mock/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/superuser mock design page/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/failed-release/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /pause live/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /inspector/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /live events/i })).toBeInTheDocument();
  });
});
