import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';

const topCommandBarMock = vi.fn();
const leftRailMock = vi.fn();
const projectSwitcherMock = vi.fn();

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { display_name: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/TopCommandBar', () => ({
  TopCommandBar: (props: { primaryContext?: React.ReactNode; hideProjectSwitcher?: boolean; hideSearch?: boolean }) => {
    topCommandBarMock(props);
    return (
      <div data-testid="top-command-bar">
        <div data-testid="top-command-bar-left">{props.primaryContext}</div>
        <div data-testid="top-command-bar-flags">
          {props.hideProjectSwitcher ? 'hide-project-switcher' : 'show-project-switcher'}
          {props.hideSearch ? ' hide-search' : ' show-search'}
        </div>
      </div>
    );
  },
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: (props: { headerContent?: React.ReactNode }) => {
    leftRailMock(props);
    return (
      <div data-testid="left-rail">
        <div data-testid="left-rail-header-content">{props.headerContent}</div>
      </div>
    );
  },
}));

vi.mock('@/components/shell/RightRailShell', () => ({
  RightRailShell: () => <div data-testid="right-rail-shell" />,
}));

vi.mock('@/components/shell/HeaderCenterContext', () => ({
  HeaderCenterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useHeaderCenter: () => ({
    pageHeader: null,
  }),
}));

vi.mock('@/components/shell/RightRailContext', () => ({
  RightRailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRightRailContext: () => ({
    content: null,
    activeTab: 'help',
    isOpen: false,
    chatDetached: false,
    setActiveTab: vi.fn(),
    setChatDetached: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock('@/components/shell/AssistantDockHost', () => ({
  AssistantDockHost: () => <div data-testid="assistant-dock-host" />,
}));

vi.mock('@/components/layout/AppPageShell', () => ({
  AppPageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-page-shell">{children}</div>
  ),
}));

vi.mock('@ark-ui/react/drawer', () => ({
  Drawer: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Backdrop: () => null,
    Positioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useDraggable', () => ({
  useDraggable: () => ({
    position: null,
    isDragging: false,
    handleRef: { current: null },
  }),
}));

vi.mock('@/components/shell/ProjectSwitcher', () => ({
  ProjectSwitcher: (props: { variant?: 'default' | 'sidebar-row'; triggerTestId?: string }) => {
    projectSwitcherMock(props);
    return <div data-testid={props.triggerTestId ?? 'project-switcher'}>Project Switcher</div>;
  },
}));

afterEach(() => {
  cleanup();
  topCommandBarMock.mockReset();
  leftRailMock.mockReset();
  projectSwitcherMock.mockReset();
});

function renderAt(pathname: string) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/app/*" element={<div data-testid="route-content" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout route shells', () => {
  it('renders schema routes without AppPageShell so the workbench can fill the full height', () => {
    renderAt('/app/schemas');

    expect(screen.getByTestId('route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-page-shell')).not.toBeInTheDocument();
  });

  it('renders the workspace route without AppPageShell so the workspace can fill the full height', () => {
    renderAt('/app/workspace');

    expect(screen.getByTestId('route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-page-shell')).not.toBeInTheDocument();
  });

  it('renders the flows list route without AppPageShell so the table remains full-bleed', () => {
    renderAt('/app/flows');

    expect(screen.getByTestId('route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-page-shell')).not.toBeInTheDocument();
  });

  it('renders pipeline services routes without AppPageShell so the workbench can fill the full height', () => {
    renderAt('/app/pipeline-services/index-builder');

    expect(screen.getByTestId('route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('app-page-shell')).not.toBeInTheDocument();
  });

  it('keeps generic app routes inside AppPageShell', () => {
    renderAt('/app');

    expect(screen.getByTestId('route-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-page-shell')).toBeInTheDocument();
  });

  it('renders the Blockdata project selector in the rail header content instead of the top command bar', () => {
    renderAt('/app/assets');

    expect(screen.getByTestId('top-command-bar-flags')).toHaveTextContent('hide-project-switcher');
    expect(screen.getByTestId('left-rail-header-content')).toHaveTextContent('Project Switcher');
    expect(screen.queryByTestId('project-switcher')).not.toBeInTheDocument();
    expect(projectSwitcherMock.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      variant: 'sidebar-row',
      triggerTestId: 'blockdata-project-context',
    }));
  });

  it('does not render the Blockdata project selector in the rail header on superuser routes', () => {
    renderAt('/app/superuser');

    expect(screen.getByTestId('top-command-bar-flags')).toHaveTextContent('hide-project-switcher');
    expect(screen.getByTestId('top-command-bar-flags')).toHaveTextContent('hide-search');
    expect(screen.getByTestId('left-rail-header-content')).toBeEmptyDOMElement();
    expect(projectSwitcherMock).not.toHaveBeenCalled();
  });
});
