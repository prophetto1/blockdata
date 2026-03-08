import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeftRailShadcn } from './LeftRailShadcn';

const rpcMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(),
      })),
    })),
  },
}));

describe('LeftRailShadcn', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({
      data: [
        {
          project_id: 'default-project-id',
          project_name: 'Default Project',
          doc_count: 11,
          workspace_id: null,
        },
      ],
      error: null,
    });
  });

  it('renders the brand logo and top-level nav items', async () => {
    render(
      <MemoryRouter initialEntries={['/app/elt']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Go to home' })).toBeInTheDocument();
    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(screen.getByText('ELT')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    // "Settings" appears in nav items and also in account menu
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('shows drill view when on a settings route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/settings/profile']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    // Drill view shows settings sub-items
    expect(await screen.findByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('AI Providers')).toBeInTheDocument();
  });

  it('renders compact mode with icon-only buttons', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/elt']}>
        <LeftRailShadcn desktopCompact />
      </MemoryRouter>,
    );

    // In compact mode, nav items render as icon-only buttons with title/aria-label
    const navButtons = container.querySelectorAll('button[title]');
    expect(navButtons.length).toBeGreaterThanOrEqual(5);
  });
});
