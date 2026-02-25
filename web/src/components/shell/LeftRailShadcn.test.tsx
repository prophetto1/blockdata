import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { LeftRailShadcn } from '@/components/shell/LeftRailShadcn';

const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn().mockResolvedValue({ data: [], error: null }),
  fromMock: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function renderRail(initialPath: string, options?: { desktopCompact?: boolean }) {
  const desktopCompact = options?.desktopCompact ?? false;
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={(
            <>
              <LeftRailShadcn desktopCompact={desktopCompact} />
              <LocationProbe />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LeftRailShadcn Documents menu behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
  });

  it('keeps Documents submenu closed by default even on Documents routes', async () => {
    renderRail('/app/projects/project-123');

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    });

    expect(screen.queryByRole('link', { name: 'Upload' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Parse' })).not.toBeInTheDocument();
  });

  it('auto-closes Documents submenu after navigating to another top-level menu', async () => {
    renderRail('/app/projects/project-123');

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Documents' })[0]);
    expect(screen.getByRole('link', { name: 'Upload' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('link', { name: 'Flows' })[0]);

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Upload' })).not.toBeInTheDocument();
    });
  });

  it('routes compact Documents entry to Upload by default', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ project_id: 'project-123', project_name: 'Project 123', doc_count: 0, workspace_id: null }],
      error: null,
    });
    renderRail('/app/projects/project-123', { desktopCompact: true });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    });

    const docsLink = screen
      .getAllByRole('link')
      .find((node) => node.getAttribute('href') === '/app/projects/project-123/upload');

    expect(docsLink).toBeTruthy();
    fireEvent.click(docsLink!);

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/app/projects/project-123/upload');
    });
  });

  it('uses square compact hit targets for primary nav icons', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ project_id: 'project-123', project_name: 'Project 123', doc_count: 0, workspace_id: null }],
      error: null,
    });
    renderRail('/app/projects/project-123', { desktopCompact: true });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    });

    const docsLink = screen
      .getAllByRole('link')
      .find((node) => node.getAttribute('href') === '/app/projects/project-123/upload');

    expect(docsLink).toBeTruthy();
    const docsButton = docsLink!.closest('[data-sidebar="menu-button"]');
    expect(docsButton).toHaveClass('size-10');
    expect(docsButton).not.toHaveClass('h-10');
  });

  it('removes project card border and renders a logo-project separator in expanded rail', async () => {
    renderRail('/app/flows', { desktopCompact: false });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    });

    const selectProjectButton = screen.getByRole('button', { name: 'Select project' });
    const projectCard = selectProjectButton.parentElement?.parentElement as HTMLElement | null;
    expect(projectCard).toBeTruthy();
    expect(projectCard).not.toHaveClass('border');
    expect(screen.getByTestId('left-rail-project-separator')).toBeInTheDocument();
  });

  it('renders a full-width separator above the expanded account section', async () => {
    renderRail('/app/flows', { desktopCompact: false });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalled();
    });

    expect(screen.getByTestId('left-rail-account-separator')).toBeInTheDocument();
  });
});
