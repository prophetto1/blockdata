import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectSwitcher } from './ProjectSwitcher';

const useProjectFocusMock = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
}

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => useProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProjectSwitcher', () => {
  function buildFocusState() {
    return {
      projectOptions: [
        { value: 'project-1', label: 'Alpha Project', docCount: 11, workspaceId: null },
        { value: 'project-2', label: 'Beta Project', docCount: 4, workspaceId: null },
      ],
      resolvedProjectId: 'project-1',
      resolvedProjectName: 'Alpha Project',
      setFocusedProjectId: vi.fn(),
    };
  }

  beforeEach(() => {
    useProjectFocusMock.mockReset();
    useProjectFocusMock.mockReturnValue(buildFocusState());
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
  });

  it('renders the selected BlockData project in the shared selector trigger', () => {
    render(
      <MemoryRouter>
        <ProjectSwitcher />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /alpha project/i })).toBeInTheDocument();
  });

  it('keeps the create-project footer path under the shared selector contract', async () => {
    render(
      <MemoryRouter>
        <ProjectSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /alpha project/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Create Project' })).toHaveAttribute('href', '/app/projects/list?new=1');
    });
  });

  it('updates focused project selection through the BlockData wrapper', async () => {
    const setFocusedProjectId = vi.fn();
    useProjectFocusMock.mockReturnValue({
      ...buildFocusState(),
      setFocusedProjectId,
    });

    render(
      <MemoryRouter>
        <ProjectSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /alpha project/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /beta project/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /beta project/i }));

    expect(setFocusedProjectId).toHaveBeenCalledWith('project-2');
  });
});
