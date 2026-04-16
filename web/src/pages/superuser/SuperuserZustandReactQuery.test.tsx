import { cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';
import { createAppQueryClient } from '@/lib/queryClient';
import { superuserKeys } from '@/lib/queryKeys/superuserKeys';
import routerSource from '@/router.tsx?raw';
import { resetSuperuserControlTowerStore } from '@/stores/useSuperuserControlTowerStore';
import { renderWithQueryClient } from '@/test/renderWithQueryClient';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

const coordinationStatusData = {
  broker: { state: 'available', url: 'nats://127.0.0.1:4222', server: 'JON', error_type: null },
  presence_summary: { active_agents: 3 },
  identity_summary: {
    active_count: 3,
    stale_count: 1,
    host_count: 1,
    family_counts: { cdx: 3 },
  },
  discussion_summary: {
    thread_count: 2,
    pending_count: 1,
    stale_count: 0,
    workspace_bound_count: 2,
  },
};

function seedCoordinationQueries(queryClient: ReturnType<typeof createAppQueryClient>) {
  queryClient.setQueryData(superuserKeys.coordinationStatus(), coordinationStatusData);
}

async function renderPage(queryClient = createAppQueryClient({ testMode: true })) {
  const { Component } = await import('./SuperuserZustandReactQuery');

  return renderWithQueryClient(
    <MemoryRouter initialEntries={['/app/superuser/zustand-react-query']}>
      <Component />
    </MemoryRouter>,
    { queryClient },
  );
}

beforeEach(() => {
  resetSuperuserControlTowerStore();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetSuperuserControlTowerStore();
});

describe('SuperuserZustandReactQuery', () => {
  it('registers the route and renders the ownership-first surface', async () => {
    const controlTowerSection = SUPERUSER_NAV_SECTIONS.find(
      (section) => section.label === 'CONTROL TOWER',
    );

    expect(
      controlTowerSection?.items.some((item) => item.path === '/app/superuser/zustand-react-query'),
    ).toBe(true);
    expect(routerSource).toContain("path: 'zustand-react-query'");

    await renderPage();

    expect(screen.getByTestId('superuser-zustand-react-query-ownership-surface')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'State Management' })).toBeInTheDocument();
    expect(screen.getByText(/TanStack Query owns server truth/i)).toBeInTheDocument();
    expect(screen.getByText(/Zustand owns browser-only operator state/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /route ownership/i })).toBeInTheDocument();
    expect(screen.queryByTestId('superuser-zustand-react-query-placeholder')).not.toBeInTheDocument();
  });

  it('lets the operator inspect a specific owning route', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Coordination Runtime' }));

    expect(screen.getAllByText('/app/superuser/coordination-runtime').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/coordination status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/coordination identities/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/coordination discussions/i).length).toBeGreaterThan(0);
  });

  it('is honest when a query family has not been observed in this session yet', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Operational Readiness' }));

    expect(screen.getAllByText(/not yet observed in this session/i).length).toBeGreaterThan(0);
  });

  it('surfaces observed cache state without replaying the source page', async () => {
    const queryClient = createAppQueryClient({ testMode: true });
    seedCoordinationQueries(queryClient);

    await renderPage(queryClient);

    fireEvent.click(screen.getByRole('button', { name: 'Coordination Runtime' }));

    expect(screen.getAllByText(/observed in current query cache/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/slice-scoped cache summary/i)).not.toBeInTheDocument();
  });
});
