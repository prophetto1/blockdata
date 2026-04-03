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

vi.mock('@/components/shell/ShellWorkspaceSelector', () => ({
  ShellWorkspaceSelector: () => <button type="button">Workspace Selector</button>,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { display_name: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: (props: {
    headerBrand?: React.ReactNode;
    headerContent?: React.ReactNode;
    desktopCompact?: boolean;
    onToggleDesktopCompact?: () => void;
  }) => {
    leftRailMock(props);
    return (
      <div data-testid="agchain-primary-rail-content" data-compact={props.desktopCompact ? 'true' : 'false'}>
        <div data-testid="agchain-primary-rail-brand">{props.headerBrand}</div>
        <div data-testid="agchain-primary-rail-header-content">{props.headerContent}</div>
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
  it('renders primary rail and outlet on overview-first routes', () => {
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
    expect(screen.getByTestId('top-command-bar-flags')).toHaveTextContent('hide-project-switcher');
    expect(screen.getByTestId('top-command-bar-flags')).toHaveTextContent('hide-search');
    expect(screen.getByTestId('agchain-shell-top-divider')).toBeInTheDocument();
    expect(screen.getByTestId('agchain-route-content')).toBeInTheDocument();
  });

  it('renders the AGChain organization and project selectors in the rail header content instead of the top command bar', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <Routes>
          <Route element={<AgchainShellLayout />}>
            <Route path="/app/agchain/*" element={<div data-testid="agchain-route-content" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const railContent = screen.getByTestId('agchain-primary-rail-header-content');
    expect(within(railContent).getByTestId('agchain-organization-context')).toBeInTheDocument();
    expect(within(railContent).getByTestId('agchain-project-context')).toBeInTheDocument();
    expect(within(screen.getByTestId('top-command-bar-left')).queryByTestId('agchain-organization-context')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('top-command-bar-left')).queryByTestId('agchain-project-context')).not.toBeInTheDocument();
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
    expect(rail2).toHaveStyle({ top: '60px', bottom: '0px' });
    expect(screen.getByTestId('agchain-settings-nav')).toBeInTheDocument();
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
});
