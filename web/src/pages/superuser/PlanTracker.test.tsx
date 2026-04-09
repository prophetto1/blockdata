import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Component as PlanTracker } from './PlanTracker';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';
import routerSource from '@/router.tsx?raw';

const usePlanTrackerMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('./usePlanTracker', () => ({
  usePlanTracker: (...args: unknown[]) => usePlanTrackerMock(...args),
  PLAN_TRACKER_TABS: [
    { id: 'files', label: 'Files', icon: null },
    { id: 'preview', label: 'Preview', icon: null },
    { id: 'placeholder', label: 'Placeholder', icon: null },
  ],
  PLAN_TRACKER_DEFAULT_PANES: [
    { id: 'pane-1', activeTab: 'files' },
    { id: 'pane-2', activeTab: 'preview' },
    { id: 'pane-3', activeTab: 'placeholder' },
  ],
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: ({
    defaultPanes,
    renderContent,
  }: {
    defaultPanes: Array<{ id: string; activeTab: string }>;
    renderContent: (tabId: string) => React.ReactNode;
  }) => (
    <div data-testid="plan-tracker-workbench">
      {defaultPanes.map((pane) => (
        <section key={pane.id} data-testid={pane.id}>
          {renderContent(pane.activeTab)}
        </section>
      ))}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  usePlanTrackerMock.mockReset();
});

describe('PlanTracker', () => {
  it('renders the live three-pane shell from the tracker hook instead of fixture data', () => {
    usePlanTrackerMock.mockReturnValue({
        renderContent: (tabId: string) => <div data-testid={`content-${tabId}`}>live-{tabId}</div>,
      });

    render(<PlanTracker />);

    expect(usePlanTrackerMock).toHaveBeenCalled();
    expect(screen.getByTestId('plan-tracker-workbench')).toBeInTheDocument();
    expect(screen.getByTestId('content-files')).toHaveTextContent('live-files');
    expect(screen.getByTestId('content-preview')).toHaveTextContent('live-preview');
    expect(screen.getByTestId('content-placeholder')).toHaveTextContent('live-placeholder');
    expect(screen.queryByText('Fixture mode only. Workflow actions stay unwired until the live tracker hook is introduced.')).not.toBeInTheDocument();
  });

  it('mounts at the dedicated superuser route and exposes a dev-only nav entry', () => {
    usePlanTrackerMock.mockReturnValue({
      renderContent: (tabId: string) => <div data-testid={`content-${tabId}`}>live-{tabId}</div>,
    });

    const memoryRouter = createMemoryRouter(
      [{ path: '/app/superuser/plan-tracker', element: <PlanTracker /> }],
      { initialEntries: ['/app/superuser/plan-tracker'] },
    );

    render(<RouterProvider router={memoryRouter} />);

    expect(screen.getByTestId('plan-tracker-workbench')).toBeInTheDocument();

    const devOnlySection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV ONLY');
    expect(devOnlySection?.items.some((item) => item.path === '/app/superuser/plan-tracker')).toBe(true);

    expect(routerSource).toContain("path: 'plan-tracker'");
  });
});
