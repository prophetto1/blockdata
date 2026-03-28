import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/hooks/useSuperuserProbe', () => ({
  useSuperuserProbe: () => false,
}));

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => ({ resolvedProjectId: null }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    choice: 'system',
    setTheme: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

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
    window.localStorage.clear();
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
    window.localStorage.setItem('blockdata.nav.style', 'classic');

    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Go to home' })).toBeInTheDocument();
    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(screen.getByText('Workbench')).toBeInTheDocument();
    expect(screen.getByText('Ingest')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Services')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Bases')).toBeInTheDocument();
    expect(screen.getByText('Index Builder')).toBeInTheDocument();
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Secrets')).toBeInTheDocument();
    expect(screen.queryByText('RAG')).not.toBeInTheDocument();
  });

  it('does not render a placeholder notifications button', async () => {
    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Go to home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('defaults to pipeline navigation when no preference is stored', async () => {
    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ingest')).toBeInTheDocument();
    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Services')).toBeInTheDocument();
    expect(screen.queryByText('Define Workflows')).not.toBeInTheDocument();
    expect(screen.queryByText('Knowledge Bases')).not.toBeInTheDocument();
    expect(screen.queryByText('Parse')).not.toBeInTheDocument();
  });

  it('uses denser item sizing in classic view', async () => {
    window.localStorage.setItem('blockdata.nav.style', 'classic');

    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    const assetsButton = await screen.findByRole('button', { name: 'Assets' });

    expect(assetsButton.className).toContain('h-7');
    expect(assetsButton.className).toContain('text-xs');
    expect(assetsButton.className).toContain('px-1.5');
  });

  it('shows drill view when on a settings route', async () => {
    render(
      <MemoryRouter initialEntries={['/app/settings/profile']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('Secrets')).toBeInTheDocument();
  });

  it('shows ingest drill items on ingest routes in pipeline view', async () => {
    render(
      <MemoryRouter initialEntries={['/app/parse']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Parse')).toBeInTheDocument();
    expect(screen.getByText('Extract')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getAllByText('Ingest')).toHaveLength(1);
  });

  it('shows pipeline services drill items on knowledge base routes in pipeline view', async () => {
    render(
      <MemoryRouter initialEntries={['/app/pipeline-services/knowledge-bases']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Knowledge Bases')).toBeInTheDocument();
    expect(screen.getByText('Index Builder')).toBeInTheDocument();
    expect(screen.getAllByText('Pipeline Services')).toHaveLength(1);
  });

  it('renders Flows as a classic drill entry with a chevron', async () => {
    window.localStorage.setItem('blockdata.nav.style', 'classic');

    render(
      <MemoryRouter initialEntries={['/app/flows']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    const flowsButton = await screen.findByRole('button', { name: 'Flows' });

    expect(flowsButton.querySelector('.ml-auto')).not.toBeNull();
  });

  it('renders compact mode with icon-only buttons', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/database']}>
        <LeftRailShadcn desktopCompact />
      </MemoryRouter>,
    );

    const navButtons = container.querySelectorAll('button[title]');
    expect(navButtons.length).toBeGreaterThanOrEqual(5);
  });


  it('uses the expanded header button to collapse the side rail', () => {
    const onToggleDesktopCompact = vi.fn();

    render(
      <MemoryRouter initialEntries={['/app/database']}>
        <LeftRailShadcn onToggleDesktopCompact={onToggleDesktopCompact} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse side navigation' }));

    expect(onToggleDesktopCompact).toHaveBeenCalledTimes(1);
  });
  it('uses the compact header button to expand the side rail', async () => {
    const onToggleDesktopCompact = vi.fn();

    render(
      <MemoryRouter initialEntries={['/app/database']}>
        <LeftRailShadcn desktopCompact onToggleDesktopCompact={onToggleDesktopCompact} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Go to home' })).not.toBeInTheDocument();

    const expandButton = await screen.findByRole('button', { name: 'Expand side navigation' });
    fireEvent.click(expandButton);

    expect(onToggleDesktopCompact).toHaveBeenCalledTimes(1);
  });
});
