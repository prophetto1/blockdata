import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeftRailShadcn } from './LeftRailShadcn';

const rpcMock = vi.fn();
const superuserProbeMock = vi.fn();

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
  useSuperuserProbe: () => superuserProbeMock(),
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
    superuserProbeMock.mockReset();
    superuserProbeMock.mockReturnValue(false);
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

  it('renders the cleaned account menu without admin, settings, theme label, or changelog controls', async () => {
    superuserProbeMock.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn userLabel="jon@example.com" onSignOut={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Go to home' })).toBeInTheDocument();

    const accountMenuTrigger = screen.getByRole('button', { name: 'Account menu' });
    fireEvent.pointerDown(accountMenuTrigger);
    fireEvent.click(accountMenuTrigger);

    const menuScope = within(await screen.findByRole('menu'));

    expect(menuScope.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(menuScope.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
    expect(menuScope.queryByText('Theme')).not.toBeInTheDocument();
    expect(menuScope.queryByText('Changelog')).not.toBeInTheDocument();

    expect(menuScope.getByLabelText('Theme: System')).toBeInTheDocument();
    expect(menuScope.getByLabelText('Theme: Light')).toBeInTheDocument();
    expect(menuScope.getByLabelText('Theme: Dark')).toBeInTheDocument();
    expect(menuScope.getByText('Help')).toBeInTheDocument();
    expect(menuScope.getByText('Docs')).toBeInTheDocument();
    expect(menuScope.getByText('Log Out')).toBeInTheDocument();
  });

  it('renders the brand logo and top-level nav items without inline drill children', async () => {
    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Go to home' })).toBeInTheDocument();
    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(screen.getByText('Ingest')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Services')).toBeInTheDocument();
    expect(screen.queryByText('Knowledge Bases')).not.toBeInTheDocument();
    expect(screen.queryByText('Secrets')).not.toBeInTheDocument();
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

    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Bases')).toBeInTheDocument();
    expect(screen.getByText('Index Builder')).toBeInTheDocument();
    expect(screen.getAllByText('Pipeline Services')).toHaveLength(1);
  });

  it('shows pipeline services overview as the active drill item on overview routes in pipeline view', async () => {
    render(
      <MemoryRouter initialEntries={['/app/pipeline-services']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    const overviewButton = await screen.findByRole('button', { name: 'Overview' });

    expect(overviewButton.className).toContain('bg-sidebar-accent');
    expect(screen.getByText('Index Builder')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Bases')).toBeInTheDocument();
    expect(screen.getAllByText('Pipeline Services')).toHaveLength(1);
  });

  it('shows pipeline services drill items on index builder routes in pipeline view', async () => {
    render(
      <MemoryRouter initialEntries={['/app/pipeline-services/index-builder']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Bases')).toBeInTheDocument();
    expect(screen.getByText('Index Builder')).toBeInTheDocument();
    expect(screen.getAllByText('Pipeline Services')).toHaveLength(1);
  });

  it('renders Flows as a drill entry with a chevron', async () => {
    render(
      <MemoryRouter initialEntries={['/app/assets']}>
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

  it('renders optional header content below the brand and above the nav items', async () => {
    render(
      <MemoryRouter initialEntries={['/app/assets']}>
        <LeftRailShadcn
          {...({
            navSections: [
              {
                label: 'Project',
                items: [
                  {
                    label: 'Overview',
                    path: '/app/assets',
                    icon: () => null,
                  },
                ],
              },
            ],
            headerBrand: <div data-testid="rail-brand">Brand</div>,
            headerContent: <div data-testid="rail-header-content">Selector</div>,
          } as Record<string, unknown>)}
        />
      </MemoryRouter>,
    );

    const brand = await screen.findByTestId('rail-brand');
    const headerContent = screen.getByTestId('rail-header-content');
    const navButton = screen.getByRole('button', { name: 'Overview' });

    expect(headerContent).toBeInTheDocument();
    expect(navButton).toBeInTheDocument();
    expect(brand.compareDocumentPosition(headerContent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(headerContent.compareDocumentPosition(navButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('omits empty section headings and renders AGChain nav rows with denser lighter styling', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <LeftRailShadcn
          {...({
            navSections: [
              {
                label: '',
                items: [
                  {
                    label: 'Overview',
                    path: '/app/agchain/overview',
                    icon: () => null,
                  },
                ],
              },
              {
                label: 'Eval',
                items: [
                  {
                    label: 'Datasets',
                    path: '/app/agchain/eval/datasets',
                    icon: () => null,
                  },
                ],
              },
            ],
          } as Record<string, unknown>)}
        />
      </MemoryRouter>,
    );

    const overviewButton = await screen.findByRole('button', { name: 'Overview' });

    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(screen.getByText('Eval')).toBeInTheDocument();
    expect(overviewButton.className).toContain('h-[26px]');
    expect(overviewButton.className).toContain('px-1.5');
    expect(overviewButton.className).toContain('gap-2');
    expect(overviewButton.className).toContain('font-normal');
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
