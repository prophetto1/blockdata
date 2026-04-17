import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { AgchainShellLayout } from './AgchainShellLayout';

const topCommandBarMock = vi.fn();
const leftRailMock = vi.fn();

const AGCHAIN_DESKTOP_NAV_OPEN_KEY = 'agchain.shell.nav_open_desktop';
const AGCHAIN_SIDEBAR_WIDTH_KEY = 'agchain.shell.sidebar_width';

function HeaderRegistrationRoute() {
  return (
    <>
      <ShellPageHeader
        title="Tools"
        description="Manage the merged tool registry for Legal-10."
      />
      <div data-testid="agchain-route-content" />
    </>
  );
}

function InlineHeaderRegistrationRoute() {
  return (
    <>
      <ShellPageHeader
        title="Tasks"
        description="Define the project-scoped task surface."
      />
      <div data-testid="agchain-route-content" />
    </>
  );
}

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: false,
    toggle: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/shell/ProjectSwitcher', () => ({
  ProjectSwitcher: () => <div data-testid="project-switcher">Project Switcher</div>,
}));

vi.mock('@/components/shell/ShellPlatformToggle', () => ({
  ShellPlatformToggle: () => <div data-testid="agchain-platform-toggle">Platform Toggle</div>,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'token-1' },
    profile: { display_name: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: (props: {
    headerBrand?: React.ReactNode;
    headerContent?: React.ReactNode;
    footerContent?: React.ReactNode;
    accountMenuHeaderContent?: React.ReactNode;
    hideHeaderSeparator?: boolean;
    navContentClassName?: string;
    desktopCompact?: boolean;
    onToggleDesktopCompact?: () => void;
  }) => {
    leftRailMock(props);
    return (
      <div data-testid="agchain-primary-rail-content" data-compact={props.desktopCompact ? 'true' : 'false'}>
        <div data-testid="agchain-primary-rail-brand">{props.headerBrand}</div>
        <div data-testid="agchain-primary-rail-header-content">{props.headerContent}</div>
        <div data-testid="agchain-primary-rail-footer-content">{props.footerContent}</div>
        <div data-testid="agchain-primary-rail-account-menu-header-content">{props.accountMenuHeaderContent}</div>
      </div>
    );
  },
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

vi.mock('@/components/agchain/AgchainProjectSwitcher', () => ({
  AgchainProjectSwitcher: () => <div data-testid="agchain-project-context">Focused AGChain project</div>,
}));

vi.mock('@/components/agchain/AgchainOrganizationSwitcher', () => ({
  AgchainOrganizationSwitcher: () => <div data-testid="agchain-organization-context">Focused AGChain organization</div>,
}));

vi.mock('@/components/agchain/settings/AgchainSettingsNav', () => ({
  AgchainSettingsNav: () => <div data-testid="agchain-settings-nav">AGChain Settings Nav</div>,
}));

afterEach(() => {
  cleanup();
  leftRailMock.mockReset();
  topCommandBarMock.mockReset();
  window.localStorage.clear();
});

describe('AgchainShellLayout', () => {
  it('renders primary rail and outlet on overview-first routes without the fixed top shell', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-secondary-rail')).not.toBeInTheDocument();
    expect(screen.getByTestId('agchain-primary-rail-brand')).toHaveTextContent('BlockDataBench');
    expect(screen.queryByTestId('project-switcher')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agchain-top-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-command-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agchain-rail-utilities')).not.toBeInTheDocument();
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });

  it('keeps the project selector in the rail header while the platform toggle and organization selector stay in the account menu', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const railHeader = within(screen.getByTestId('agchain-primary-rail-header-content'));
    const accountMenuHeader = within(screen.getByTestId('agchain-primary-rail-account-menu-header-content'));

    const projectContextShell = railHeader.getByTestId('agchain-project-context-shell');
    const projectContext = within(projectContextShell).getByTestId('agchain-project-context');
    expect(projectContext).toBeInTheDocument();
    expect(projectContextShell.className).toContain('-ml-[12px]');
    expect(projectContextShell.className).toContain('mt-[10px]');
    expect(projectContextShell.className).toContain('-mb-[36px]');
    expect(railHeader.queryByTestId('agchain-organization-context')).not.toBeInTheDocument();
    const platformToggle = accountMenuHeader.getByTestId('agchain-platform-toggle');
    const organizationContext = accountMenuHeader.getByTestId('agchain-organization-context');

    expect(platformToggle).toBeInTheDocument();
    expect(organizationContext).toBeInTheDocument();
    expect(platformToggle.compareDocumentPosition(organizationContext) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(accountMenuHeader.queryByTestId('agchain-project-context')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('agchain-primary-rail-footer-content')).queryByTestId('agchain-platform-toggle')).not.toBeInTheDocument();
    const lastCall = leftRailMock.mock.calls.at(-1)?.[0] as {
      hideHeaderSeparator?: boolean;
      navContentClassName?: string;
    } | undefined;
    expect(lastCall?.hideHeaderSeparator).toBe(true);
    expect(lastCall?.navContentClassName).toBe('pl-[10px]');
  });

  it('restores AGChain-owned persisted desktop rail width from local storage', () => {
    window.localStorage.setItem(AGCHAIN_SIDEBAR_WIDTH_KEY, '312');

    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toHaveStyle({ width: '312px' });
  });

  it('ignores stale AGChain compact-state storage and keeps the rail expanded', () => {
    window.localStorage.setItem(AGCHAIN_DESKTOP_NAV_OPEN_KEY, 'false');

    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-primary-rail-content')).toHaveAttribute('data-compact', 'false');
    const lastCall = leftRailMock.mock.calls.at(-1)?.[0] as { desktopCompact?: boolean } | undefined;
    expect(lastCall?.desktopCompact).not.toBe(true);
  });

  it('does not wire the shared compact-toggle affordance into the AGChain rail', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const lastCall = leftRailMock.mock.calls.at(-1)?.[0] as { onToggleDesktopCompact?: () => void } | undefined;
    expect(lastCall?.onToggleDesktopCompact).toBeUndefined();
  });

  it('renders the settings secondary rail on settings routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/settings/organization/members']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    const rail2 = screen.getByTestId('agchain-secondary-rail');
    expect(rail2).toBeInTheDocument();
    expect(rail2).toHaveStyle({ top: '0px', bottom: '0px' });
    expect(screen.getByTestId('agchain-settings-nav')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-top-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agchain-rail-utilities')).not.toBeInTheDocument();
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });

  it('does not render secondary rail on compatibility benchmark routes before redirect handling', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/benchmarks/legal-10']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-secondary-rail')).not.toBeInTheDocument();
  });

  it('does not render secondary rail on models route', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/models']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-platform-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('agchain-secondary-rail')).not.toBeInTheDocument();
  });

  it('renders registered AGChain page headers inside the fixed shell header', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/tools']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<HeaderRegistrationRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const header = screen.getByTestId('top-command-bar-left');
    expect(within(header).getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
    expect(within(header).getByText('Manage the merged tool registry for Legal-10.')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });

  it('drops the fixed top header on containerized AGChain routes and lets page headers render inline', () => {
    const entries = [
      '/app/agchain/overview',
      '/app/agchain/datasets',
      '/app/agchain/eval/datasets',
      '/app/agchain/playground',
      '/app/agchain/sandbox',
      '/app/agchain/settings/organization/members',
      '/app/agchain/eval/tasks',
      '/app/agchain/monitor/metrics',
      '/app/agchain/harness/prompts',
    ];

    for (const entry of entries) {
      const view = render(
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route element={<AgchainShellLayout />}>
              <Route path="/app/agchain/*" element={<InlineHeaderRegistrationRoute />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('agchain-top-header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('top-command-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agchain-rail-utilities')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Workspace Selector' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
      expect(screen.getByText('Define the project-scoped task surface.')).toBeInTheDocument();
      expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();

      view.unmount();
    }
  });
});
