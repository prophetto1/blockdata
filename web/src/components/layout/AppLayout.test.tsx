import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';

const { leftRailPropsMock, signOutMock } = vi.hoisted(() => ({
  leftRailPropsMock: vi.fn(),
  signOutMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'user@example.com' },
    profile: { display_name: 'Jane Doe', email: 'profile@example.com' },
    signOut: signOutMock,
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    shellV2: true,
    assistantDock: false,
  },
}));

vi.mock('@/components/shell/TopCommandBar', () => ({
  TopCommandBar: () => <div data-testid="top-command-bar" />,
}));

vi.mock('@/components/layout/AppPageShell', () => ({
  AppPageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-page-shell">{children}</div>
  ),
}));

vi.mock('@/components/shell/AssistantDockHost', () => ({
  AssistantDockHost: () => <div data-testid="assistant-dock-host" />,
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: (props: unknown) => {
    leftRailPropsMock(props);
    return <div data-testid="left-rail-probe" />;
  },
}));

function renderLayout(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/app" element={<AppLayout />}>
          <Route path="flows" element={<div data-testid="outlet-content">Flows Content</div>} />
          <Route path="projects/:projectId" element={<div data-testid="outlet-content">Project Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout desktop nav persisted-state migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    leftRailPropsMock.mockClear();
    signOutMock.mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('resets stale collapsed desktop nav once and renders expanded rail', () => {
    window.localStorage.setItem('blockdata.shell.nav_open_desktop', 'false');

    renderLayout('/app/flows');

    expect(window.localStorage.getItem('blockdata.shell.nav_open_desktop')).toBe('true');
    expect(window.localStorage.getItem('blockdata.shell.nav_open_desktop.reset_once_v1')).toBe('true');

    const lastCall = leftRailPropsMock.mock.calls[leftRailPropsMock.mock.calls.length - 1]?.[0] as {
      desktopCompact?: boolean;
    };
    expect(lastCall.desktopCompact).toBe(false);
  });

  it('does not override desktop nav state after migration marker exists', () => {
    window.localStorage.setItem('blockdata.shell.nav_open_desktop', 'false');
    window.localStorage.setItem('blockdata.shell.nav_open_desktop.reset_once_v1', 'true');

    renderLayout('/app/flows');

    expect(window.localStorage.getItem('blockdata.shell.nav_open_desktop')).toBe('false');

    const lastCall = leftRailPropsMock.mock.calls[leftRailPropsMock.mock.calls.length - 1]?.[0] as {
      desktopCompact?: boolean;
    };
    expect(lastCall.desktopCompact).toBe(true);
  });
});
