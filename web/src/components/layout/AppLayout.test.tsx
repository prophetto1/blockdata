import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { display_name: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/TopCommandBar', () => ({
  TopCommandBar: () => <div data-testid="top-command-bar" />,
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: () => <div data-testid="left-rail" />,
}));

vi.mock('@/components/shell/RightRailShell', () => ({
  RightRailShell: () => <div data-testid="right-rail-shell" />,
}));

vi.mock('@/components/shell/HeaderCenterContext', () => ({
  HeaderCenterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

afterEach(() => {
  cleanup();
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

  it('keeps generic app routes inside AppPageShell', () => {
    renderAt('/app');

    expect(screen.getByTestId('route-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-page-shell')).toBeInTheDocument();
  });
});
