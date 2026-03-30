import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectFocusSelectorPopover } from './ProjectFocusSelectorPopover';

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProjectFocusSelectorPopover', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
  });

  it('renders a searchable shared selector shell with footer navigation', async () => {
    render(
      <MemoryRouter>
        <ProjectFocusSelectorPopover
          items={[
            { id: 'project-1', label: 'Alpha Project', description: 'First project' },
            { id: 'project-2', label: 'Beta Project', description: 'Second project' },
          ]}
          selectedItemId="project-1"
          triggerLabel="Alpha Project"
          searchPlaceholder="Find Project..."
          emptyLabel="No projects found"
          footerActionLabel="Create Project"
          footerActionHref="/app/projects/list?new=1"
          onSelectItem={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /alpha project/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find Project...')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Create Project' })).toHaveAttribute('href', '/app/projects/list?new=1');
  });

  it('filters results and shows the shared empty state', async () => {
    render(
      <MemoryRouter>
        <ProjectFocusSelectorPopover
          items={[{ id: 'project-1', label: 'Alpha Project', description: 'First project' }]}
          selectedItemId="project-1"
          triggerLabel="Alpha Project"
          searchPlaceholder="Find Project..."
          emptyLabel="No projects found"
          footerActionLabel="Create Project"
          footerActionHref="/app/projects/list?new=1"
          onSelectItem={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /alpha project/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find Project...')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Find Project...'), { target: { value: 'zeta' } });

    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });
});
